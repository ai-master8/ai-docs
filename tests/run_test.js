#!/usr/bin/env node
'use strict';

/*
 * Мини-раннер тестов для note-tree.html.
 *
 * Загружает приложение в jsdom (инлайновый <script> выполняется целиком),
 * выставляет глобальные window/document/app и простой набор describe/test,
 * затем подключает файл с тестами.
 *
 * Запуск (из корня репозитория):
 *   node tests/run_test.js tests/note_tree.test.js
 */

const fs = require('fs');
const path = require('path');

const testsDir = __dirname;
const root = path.resolve(testsDir, '..');

// jsdom установлен локально в tests/node_modules (см. tests/package.json).
const { JSDOM } = require(path.join(testsDir, 'node_modules', 'jsdom'));

const html = fs.readFileSync(path.join(root, 'note-tree.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously', // выполняем инлайновый <script> приложения
  pretendToBeVisual: true,
});
const { window } = dom;

// jsdom не реализует часть браузерных API, которые приложение вызывает
// только по действию пользователя — даём безопасные заглушки.
window.Element.prototype.scrollIntoView = function () {};
window.print = function () {};

// Глобальные удобства для тестовых файлов.
global.window = window;
global.document = window.document;
global.Node = window.Node;
global.NodeFilter = window.NodeFilter;
global.HTMLElement = window.HTMLElement;
global.Element = window.Element;
global.Event = window.Event;
global.MouseEvent = window.MouseEvent;
global.KeyboardEvent = window.KeyboardEvent;
global.CustomEvent = window.CustomEvent;
// В Node 22 часть глобальных имён (navigator, localStorage) — только для чтения,
// поэтому не переопределяем их без необходимости: тесты используют window.*.
global.requestAnimationFrame = window.requestAnimationFrame
  || ((cb) => setTimeout(cb, 0));

// Приложение инициализируется синхронно при парсинге HTML, поэтому хук уже готов.
const app = window.__app;
if (!app) {
  console.error('Не найден window.__app — инициализация note-tree.html не удалась.');
  process.exit(1);
}

// ---- крохотный тестовый фреймворк ----
const suites = [];
const globalBefores = [];
const globalAfters = [];
let current = null;

function describe(name, fn) {
  current = { name, tests: [], befores: [], afters: [] };
  suites.push(current);
  fn();
  current = null;
}
function test(name, fn) {
  if (!current) { current = { name: '', tests: [], befores: [], afters: [] }; suites.push(current); }
  current.tests.push({ name, fn });
}
const it = test;
// beforeEach/afterEach на верхнем уровне — глобальные (для всех тестов);
// внутри describe — локальные для этого блока.
function beforeEach(fn) { if (current) current.befores.push(fn); else globalBefores.push(fn); }
function afterEach(fn) { if (current) current.afters.push(fn); else globalAfters.push(fn); }

global.describe = describe;
global.test = test;
global.it = it;
global.beforeEach = beforeEach;
global.afterEach = afterEach;
// Обычный assert (не .strict): массивы/объекты, созданные в jsdom-реалме, имеют
// другой прототип, поэтому cross-realm сравнение через deepStrictEqual падает.
global.assert = require('assert');
global.app = app;
// Полный сброс состояния приложения + хранилища между тестами.
global.resetApp = () => {
  try { window.localStorage.clear(); } catch (e) {}
  // Сбросить кэш тяжёлых ключей и вернуться в режим localStorage:
  // в jsdom IndexedDB нет, а тесты с фейковой базой не должны влиять друг на друга.
  if (app.storageClearMemory) app.storageClearMemory();
  try { window.indexedDB = undefined; } catch (e) {}
  app.state.notes = app.applyData([]);
  // Сбрасываем навигацию, поиск и открытый просмотр заметки между тестами.
  app.resetNavigation();
  app.onSearch('');
};

const testFile = process.argv[2] || 'note_tree.test.js';
require(path.resolve(process.cwd(), testFile));

// ---- запуск ----
(async function run() {
  let pass = 0, fail = 0;
  for (const suite of suites) {
    if (suite.name) console.log('\n' + suite.name);
    for (const t of suite.tests) {
      try {
        for (const b of globalBefores) await b();
        for (const b of suite.befores) await b();
        await t.fn();
        for (const a of suite.afters) await a();
        for (const a of globalAfters) await a();
        pass++;
        console.log('  \u2713 ' + t.name);
      } catch (err) {
        fail++;
        console.log('  \u2717 ' + t.name);
        const lines = (err && err.stack ? err.stack : String(err)).split('\n').slice(0, 4);
        console.log('    ' + lines.join('\n    '));
      }
    }
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})();
