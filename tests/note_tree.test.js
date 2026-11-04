'use strict';

/*
 * Тесты для tag-tree.html.
 * Запуск: node tests/run_test.js tests/note_tree.test.js
 *
 * Доступны глобальные: describe, test, it, beforeEach, afterEach,
 * assert (assert.strict), app (window.__app), resetApp(), window, document.
 */

const { strictEqual, ok } = assert;
// deepEqual (не строгий) — чтобы сравнивать массивы из jsdom-реалма.
const deepEqual = (a, b) => assert.deepEqual(a, b);

function seed(tags, notes) {
  // applyData возвращает заметки; состояние обновляет вызывающий.
  app.state.notes = app.applyData({ tags, notes });
}

// Полный сброс состояния и хранилища перед каждым тестом.
beforeEach(resetApp);

describe('Дерево тэгов', () => {
  test('строит обе перестановки тэгов и считает уникальные заметки', () => {
    seed(
      [{ id: 't1', name: 'a' }, { id: 't2', name: 'b' }],
      [{ id: 'n1', title: 'x', tagIds: ['t1', 't2'] }]
    );
    const root = app.buildTree();
    deepEqual([...root.children.keys()].sort(), ['a', 'b']);
    strictEqual(root.children.get('a').ids.size, 1);
    strictEqual(root.children.get('a').children.get('b').ids.size, 1);
    strictEqual(root.children.get('b').children.get('a').ids.size, 1);
  });

  test('заметка без тэгов попадает в корень', () => {
    seed([], [{ id: 'n0', title: 'root', tagIds: [] }]);
    const root = app.buildTree();
    ok(root.ids.has('n0'));
  });

  test('noteBelongsToPath проверяет вхождение без генерации перестановок', () => {
    seed(
      [{ id: 't1', name: 'a' }, { id: 't2', name: 'b' }],
      [{ id: 'n1', title: 'x', tagIds: ['t1', 't2'] }]
    );
    const n = app.state.notes[0];
    strictEqual(app.noteBelongsToPath(n, []), false);      // не безтэговая
    strictEqual(app.noteBelongsToPath(n, ['a']), true);
    strictEqual(app.noteBelongsToPath(n, ['a', 'b']), true);
    strictEqual(app.noteBelongsToPath(n, ['c']), false);
  });

  test('MAX_PERM_TAGS ограничивает участие в дереве первыми 5 тэгами', () => {
    const ids = ['t1', 't2', 't3', 't4', 't5', 't6'];
    seed(
      ids.map((id, i) => ({ id, name: 'tag' + i })),
      [{ id: 'n1', title: 'x', tagIds: ids }]
    );
    const n = app.state.notes[0];
    strictEqual(app.tagsOf(n).length, 6);
    strictEqual(app.pathTagsOf(n).length, 5);
  });
});

describe('Нормализация и импорт', () => {
  test('миграция старого формата tags-имена -> tagIds', () => {
    app.state.notes = app.applyData([{ title: 'x', body: '', tags: ['a', 'b'] }]);
    strictEqual(app.state.tags.length, 2);
    strictEqual(app.state.notes[0].tagIds.length, 2);
  });

  test('дубли имён тэгов схлопываются, ссылки перенаправляются на канон', () => {
    app.state.notes = app.applyData({
      tags: [{ id: 't1', name: 'Работа' }, { id: 't2', name: 'работа' }],
      notes: [{ id: 'n1', title: 'x', tagIds: ['t2'] }],
    });
    strictEqual(app.state.tags.length, 1);
    strictEqual(app.state.tags[0].id, 't1');
    deepEqual(app.state.notes[0].tagIds, ['t1']);
  });

  test('isValidData отвергает объект с notes не-массивом (защита от затирания)', () => {
    strictEqual(app.isValidData({ notes: {} }), false);
    strictEqual(app.isValidData({ notes: 'x' }), false);
    strictEqual(app.isValidData({}), false);
    strictEqual(app.isValidData({ notes: [] }), true);
    strictEqual(app.isValidData([]), true);
  });

  test('пустые заметки отбрасываются', () => {
    const res = app.applyData([{ title: '', body: '', tagIds: [] }]);
    strictEqual(res.length, 0);
  });
});

describe('Поиск и разбор запроса', () => {
  test('parseQuery понимает #тэг, -тэг, title:, since/until', () => {
    const q = app.parseQuery('#дом -работа title:важно срочно since:2024-01-01 until: 2024-02-01');
    deepEqual(q.includeTags, ['дом']);
    deepEqual(q.excludeTags, ['работа']);
    deepEqual(q.title, ['важно']);
    ok(q.text.includes('срочно'));
    ok(q.since != null);
    ok(q.until != null);
  });

  test('since:/until: с пробелом после двоеточия распознаются', () => {
    strictEqual(app.parseQuery('since: 2024-01-01').since != null, true);
    strictEqual(app.parseQuery('until: 2024-02-01').until != null, true);
  });

  test('matchesSearch: include/exclude/title/свободный текст', () => {
    seed(
      [{ id: 't1', name: 'дом' }],
      [{ id: 'n1', title: 'Важно', body: 'купить хлеб', tagIds: ['t1'] }]
    );
    const n = app.state.notes[0];
    app.onSearch('#дом');        strictEqual(app.matchesSearch(n), true);
    app.onSearch('-дом');        strictEqual(app.matchesSearch(n), false);
    app.onSearch('title:важно'); strictEqual(app.matchesSearch(n), true);
    app.onSearch('хлеб');        strictEqual(app.matchesSearch(n), true);
    app.onSearch('молоко');      strictEqual(app.matchesSearch(n), false);
  });
});

describe('Markdown', () => {
  test('списки получают классы md-ul / md-ul.todo, нумерованные — <ol>', () => {
    const ul = app.renderMarkdown('- один\n- два');
    ok(ul.includes('<ul class="md-ul">'));
    const ol = app.renderMarkdown('1. один\n2. два');
    ok(ol.includes('<ol class="md-ul">'));
    const todo = app.renderMarkdown('- [ ] задача\n- [x] готово');
    ok(todo.includes('class="md-ul todo"'));
    ok(todo.includes('data-box="☐"'));
    ok(todo.includes('data-box="☑"'));
  });

  test('таблицы не парсятся внутри блока кода', () => {
    const md = app.renderMarkdown('```\n| a | b |\n|---|---|\n```');
    strictEqual(/<table/.test(md), false);
    ok(md.includes('md-code'));
  });

  test('таблицы обёрнуты в блок с горизонтальной прокруткой', () => {
    const md = app.renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |');
    ok(md.includes('<div class="md-table-wrap">'), 'обёртка для прокрутки на узких экранах');
    ok(md.includes('<table class="md-table">'));
    ok(md.includes('</table></div>'));
  });

  test('пустые строки сохраняются как разделители абзацев', () => {
    const md = app.renderMarkdown('Первый абзац.\n\nВторой абзац.');
    strictEqual((md.match(/md-gap/g) || []).length, 1, 'один разделитель на одну пустую строку');
    strictEqual((app.renderMarkdown('a\n\n\nb').match(/md-gap/g) || []).length, 2, 'несколько пустых строк сохраняются');
    strictEqual((app.renderMarkdown('\n\nТекст\n\n\n').match(/md-gap/g) || []).length, 0, 'края не дают пустот');
  });

  test('HTML экранируется (анти-XSS)', () => {
    const md = app.renderMarkdown('<img src=x onerror=alert(1)>');
    strictEqual(/<img/.test(md), false);
    ok(md.includes('&lt;img'));
  });

  test('ссылки допускают только http/https/mailto', () => {
    strictEqual(app.renderMarkdown('[x](javascript:alert(1))').includes('href='), false);
    ok(app.renderMarkdown('[ok](https://example.com)').includes('href="https://example.com"'));
  });
});

describe('Подсветка поиска', () => {
  test('highlightElement не портит атрибуты и подсвечивает текст', () => {
    const a = document.createElement('div');
    a.innerHTML = '<a href="https://example.com">пример сайта</a>';
    app.highlightElement(a, 'http');
    strictEqual(a.querySelector('a').getAttribute('href'), 'https://example.com');
    strictEqual(a.querySelectorAll('mark').length, 0);

    const b = document.createElement('div');
    b.innerHTML = 'купить http и молоко';
    app.highlightElement(b, 'http');
    strictEqual(b.querySelectorAll('mark').length, 1);
    strictEqual(b.querySelector('mark').textContent, 'http');
  });
});

describe('Навигация', () => {
  test('restoreLastView восстанавливает многосегментный путь', () => {
    seed([{ id: 't1', name: 'a' }, { id: 't2', name: 'b' }], []);
    window.localStorage.setItem('noteTreeLastView', JSON.stringify({ path: ['a', 'b'], q: '' }));
    app.restoreLastView();
    deepEqual(app.currentPath, ['a', 'b']);
  });

  test('restoreLastView отбрасывает несуществующие сегменты', () => {
    seed([{ id: 't1', name: 'a' }], []);
    window.localStorage.setItem('noteTreeLastView', JSON.stringify({ path: ['a', 'нет'], q: '' }));
    app.restoreLastView();
    deepEqual(app.currentPath, ['a']);
  });
});

describe('Мутации', () => {
  test('moveNoteToTag не сбрасывает текущую папку', () => {
    seed(
      [{ id: 't1', name: 'a' }, { id: 't2', name: 'b' }],
      [{ id: 'n1', title: 'x', tagIds: ['t1'] }]
    );
    app.currentPath = ['a'];
    app.moveNoteToTag('n1', 'b');
    deepEqual(app.currentPath, ['a']);
    deepEqual(app.state.notes[0].tagIds, ['t2']);
  });

  test('renameTag обновляет путь без учёта регистра сегмента', () => {
    seed([{ id: 't1', name: 'Работа' }], [{ id: 'n1', title: 'x', tagIds: ['t1'] }]);
    app.currentPath = ['работа']; // тот же тэг, другой регистр
    app.renameTag('Работа', 'Дело');
    deepEqual(app.currentPath, ['Дело']);
  });

  test('cycleFacet не удаляет свободный текст, совпавший с именем тэга', () => {
    seed([{ id: 't1', name: 'работа' }], [{ id: 'n1', title: 'x', tagIds: ['t1'] }]);
    const s = document.getElementById('search');
    s.value = 'работа';
    app.onSearch('работа');
    app.cycleFacet('работа', false);
    const val = document.getElementById('search').value;
    ok(val.includes('#работа')); // тэг добавился
    ok(val.split(/\s+/).includes('работа')); // свободный текст остался
  });
});

describe('Надёжность данных', () => {
  test('удаление заметки в корзину и восстановление', () => {
    seed([], [{ id: 'n1', title: 'X', tagIds: [] }]);
    app.moveToTrash(app.state.notes[0]);
    strictEqual(app.loadTrash().length, 1);
    app.state.notes = [];
    app.restoreFromTrash(0);
    strictEqual(app.state.notes.length, 1);
    strictEqual(app.state.notes[0].title, 'X');
  });

  test('undo возвращает состояние перед опасным действием', () => {
    seed([], [{ id: 'n1', title: 'X', tagIds: [] }]);
    app.prepareUndo('тест');
    app.state.notes = [];
    app.undoLastAction();
    strictEqual(app.state.notes.length, 1);
  });

  test('byteLength считает размер в байтах UTF-8', () => {
    strictEqual(app.byteLength('abc'), 3);
    strictEqual(app.byteLength('ё'), 2);
  });

  test('кнопка «Версии данных» открывает меню и не закрывает его тем же кликом', () => {
    app.renderAll();
    const btn = document.getElementById('backupBtn');
    const menu = document.getElementById('ctxMenu');

    btn.click();
    ok(menu.classList.contains('show'), 'меню открылось');
    ok(menu.textContent.indexOf('Корзина') !== -1, 'пункт корзины на месте');

    btn.click();
    strictEqual(menu.classList.contains('show'), false, 'повторный клик закрывает меню');
  });
});

describe('Доступность', () => {
  test('фасеты фокусируемы и имеют роль кнопки', () => {
    seed([{ id: 't1', name: 'a' }], [{ id: 'n1', title: 'x', tagIds: ['t1'] }]);
    app.renderFacets();
    const f = document.querySelector('#facetsBody .facet');
    ok(f, 'фасет отрендерен');
    strictEqual(f.getAttribute('role'), 'button');
    strictEqual(f.tabIndex, 0);
  });
});

describe('Интеграция редактора и рендера', () => {
  test('openEditor очищает поле тэгов от прошлого ввода', () => {
    document.getElementById('fTags').value = 'остаток';
    app.openEditor();
    strictEqual(document.getElementById('fTags').value, '');
    app.closeEditor();
  });

  test('saveNote создаёт заметку и заводит тэг в таблице', () => {
    app.currentPath = [];
    app.openEditor();
    document.getElementById('fTitle').value = 'Заголовок';
    document.getElementById('fBody').value = 'Текст';
    document.getElementById('fTags').value = 'работа';
    app.saveNote();
    strictEqual(app.state.notes.length, 1);
    strictEqual(app.state.tags.length, 1);
    deepEqual(app.state.notes[0].tagIds, [app.state.tags[0].id]);
  });

  test('renderNotes подсвечивает поиск, не ломая разметку ссылки', () => {
    seed([], [{ id: 'n1', title: 'x', body: '[сайт](https://example.com) и http', tagIds: [] }]);
    app.onSearch('http');
    const card = document.querySelector('#notes .note-card');
    ok(card, 'карточка отрендерена');
    ok(card.querySelector('.preview mark'), 'есть подсветка');
    strictEqual(card.querySelector('.preview a').getAttribute('href'), 'https://example.com');
  });

  test('превью карточки пропускает таблицу, но показывает текст после неё', () => {
    seed([], [{ id: 'n1', title: 'x', body: '## Раздел\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\nТекст после таблицы', tagIds: [] }]);
    app.currentPath = [];
    app.renderAll();
    const txt = document.querySelector('#notes .note-card .preview').textContent;
    ok(txt.includes('Текст после таблицы'), 'текст после таблицы виден');
    ok(!txt.includes('|---|'), 'разметка таблицы в превью не попадает');
  });
});

describe('Рендер: делегирование и инкрементальное дерево', () => {
  function seedTree() {
    seed(
      [{ id: 't1', name: 'a' }, { id: 't2', name: 'b' }],
      [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: ['t1', 't2'] }]
    );
    app.renderAll();
  }

  test('клик по карточке открывает полный просмотр, а не редактор', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.renderAll();
    const h3 = document.querySelector('#notes .note-card h3');
    ok(h3, 'карточка отрендерена');
    h3.click();
    strictEqual(document.getElementById('modalMask').classList.contains('show'), false, 'редактор не открылся');
    strictEqual(app.viewingId, 'n1');
    ok(document.getElementById('contentSplit').classList.contains('has-view'), 'включена раскладка с просмотром');
    strictEqual(document.querySelector('#noteView .nv-title').textContent, 'Заметка');
    ok(document.querySelector('#noteView .nv-body'), 'тело заметки показано');
  });

  test('клик по бэйджу тэга переходит в папку и не открывает редактор', () => {
    seedTree();
    app.onSearch('Заметка'); // глобальный поиск: карточка видна из корня
    const tag = document.querySelector('#notes .tag');
    ok(tag, 'бэйдж тэга отрендерен');
    tag.click();
    deepEqual(app.currentPath, ['a']);
    strictEqual(document.getElementById('modalMask').classList.contains('show'), false);
  });

  test('клик по папке обновляет дерево без пересоздания DOM', () => {
    seedTree();
    const row = document.querySelector('#tree .node-row');
    row.click();
    ok(document.contains(row), 'строка осталась в DOM');
    strictEqual(row.classList.contains('active'), true);
    strictEqual(document.querySelectorAll('#tree .node-row.active').length, 1);
  });

  test('сворачивание прячет детей, разворачивание возвращает тот же DOM', () => {
    seedTree();
    app.expandAllTree();
    const row = document.querySelector('#tree .node-row');
    const wrapper = row.parentNode;
    const children = wrapper.querySelector('.children');
    ok(children, 'дети построены');
    const childRow = children.querySelector('.node-row');
    row.click(); // свернуть
    strictEqual(wrapper.querySelector('.children'), null);
    row.click(); // развернуть
    ok(wrapper.querySelector('.children'), 'дети вернулись');
    strictEqual(wrapper.querySelector('.children .node-row'), childRow, 'DOM детей переиспользован');
  });

  test('при первом запуске дерево свёрнуто, но ветка текущего места видна', () => {
    seed(
      [{ id: 't1', name: 'a' }, { id: 't2', name: 'b' }],
      [{ id: 'n1', title: 'x', tagIds: ['t1', 't2'] }]
    );
    window.localStorage.removeItem('noteTreeCollapsed');
    window.localStorage.removeItem('noteTreeCollapsedDefaulted');
    app.currentPath = ['a'];
    app.initTreeCollapse();
    app.renderAll();
    const rows = [...document.querySelectorAll('#tree .node-row')].map(r => r.dataset.path).sort();
    // Верхний уровень + раскрытая ветка «a», а «b → a» скрыта.
    deepEqual(rows, ['a', 'a/b', 'b']);
    ok(document.querySelector('#tree .node-row[data-path="a"]').parentNode.querySelector('.children'));
  });

  test('сохранённая свёрнутость не переопределяется при следующих запусках', () => {
    seed(
      [{ id: 't1', name: 'a' }, { id: 't2', name: 'b' }],
      [{ id: 'n1', title: 'x', tagIds: ['t1', 't2'] }]
    );
    app.initTreeCollapse(); // однократная миграция стартового сворачивания
    app.expandAllTree(); // пользователь явно развернул всё — сохраняется пустой набор
    app.initTreeCollapse(); // повторный запуск не должен снова всё сворачивать
    app.renderAll();
    const rows = [...document.querySelectorAll('#tree .node-row')].map(r => r.dataset.path);
    ok(rows.includes('a/b') && rows.includes('b/a'), 'дерево осталось развёрнутым');
  });

  test('renderAll({ tree: false }) не трогает DOM дерева', () => {
    seedTree();
    const row = document.querySelector('#tree .node-row');
    app.renderAll({ tree: false });
    strictEqual(document.querySelector('#tree .node-row'), row);
  });

  test('смена запроса обновляет подсветку, не залипая на кэше термов', () => {
    seed([], [{ id: 'n1', title: 'x', body: 'альфа и бета', tagIds: [] }]);
    app.onSearch('альфа');
    strictEqual(document.querySelector('#notes .preview mark').textContent, 'альфа');
    app.onSearch('бета');
    strictEqual(document.querySelector('#notes .preview mark').textContent, 'бета');
  });

  test('кэш имён тэгов сбрасывается при переименовании', () => {
    seed([{ id: 't1', name: 'a' }], [{ id: 'n1', title: 'x', tagIds: ['t1'] }]);
    const n = app.state.notes[0];
    deepEqual(app.tagsLowerOf(n), ['a']);
    app.renameTag('a', 'b');
    deepEqual(app.tagsLowerOf(n), ['b']);
  });

  test('saveLastView не пишет повторно без изменения пути', () => {
    let writes = 0;
    const proto = window.Storage.prototype;
    const orig = proto.setItem;
    proto.setItem = function (k, v) { if (k === 'noteTreeLastView') writes++; return orig.call(this, k, v); };
    try {
      app.currentPath = ['уникальный-путь'];
      app.saveLastView();
      app.saveLastView();
      // Запись настроек отложена (debounce), поэтому сбрасываем очередь вручную.
      app.flushDeferredSettings();
      strictEqual(writes, 1);
    } finally {
      proto.setItem = orig;
    }
  });

  test('scheduleMdPreview обновляет предпросмотр с задержкой', async () => {
    app.openEditor();
    const body = document.getElementById('fBody');
    const box = document.getElementById('mdPreview');
    body.value = '';
    app.updateMdPreview();
    body.value = '# Отложенный';
    app.scheduleMdPreview();
    strictEqual(box.textContent.indexOf('Отложенный'), -1, 'сразу не рендерим');
    await new Promise(r => setTimeout(r, 200));
    ok(box.textContent.indexOf('Отложенный') !== -1, 'после задержки отрендерено');
    app.cancelMdPreview();
    app.closeEditor();
  });
});

describe('Просмотр заметки: полный текст в правой части', () => {
  test('клик по карточке показывает тело целиком, без обрезки', () => {
    const longBody = 'Длинный текст заметки. '.repeat(30); // заметно больше лимита превью
    seed([], [{ id: 'n1', title: 'Длинная', body: longBody, tagIds: [] }]);
    app.renderAll();
    document.querySelector('#notes .note-card h3').click();

    const bodyEl = document.querySelector('#noteView .nv-body');
    ok(bodyEl, 'блок с полным текстом есть');
    strictEqual(bodyEl.textContent.trim(), longBody.trim());
    ok(document.querySelector('#notes .note-card .preview').textContent.indexOf('\u2026') !== -1, 'в карточке превью остаётся обрезанным');
  });

  test('выбор заметки не пересобирает список (прокрутка не сбрасывается)', () => {
    seed([], [
      { id: 'n1', title: 'Раз', body: 'a', tagIds: [], updated: 3 },
      { id: 'n2', title: 'Два', body: 'b', tagIds: [], updated: 2 },
      { id: 'n3', title: 'Три', body: 'c', tagIds: [], updated: 1 }
    ]);
    app.renderAll();
    const card = document.querySelector('#notes .note-card');
    app.openNoteView(card.dataset.noteId);
    strictEqual(document.querySelector('#notes .note-card'), card, 'DOM карточек переиспользован');
    ok(card.classList.contains('selected'), 'выбранная карточка подсвечена');
  });

  test('при открытии фиксируется ширина списка, при закрытии — сбрасывается', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.renderAll();
    const card = document.querySelector('#notes .note-card');
    const notes = document.getElementById('notes');
    const split = document.getElementById('contentSplit');
    // jsdom не считает layout: имитируем сужение карточки после включения .has-view.
    card.getBoundingClientRect = () => ({ width: split.classList.contains('has-view') ? 280 : 300 });
    notes.getBoundingClientRect = () => ({ width: 360 });
    split.getBoundingClientRect = () => ({ width: 1000 });
    try {
      app.openNoteView('n1');
      ok(notes.style.flex, 'ширина списка зафиксирована под прежнюю карточку');
      app.closeNoteView();
      strictEqual(notes.style.flex, '', 'фиксация снята при закрытии');
    } finally {
      delete card.getBoundingClientRect;
      delete notes.getBoundingClientRect;
      delete split.getBoundingClientRect;
    }
  });

  test('кнопки просмотра остаются вне прокручиваемой области', () => {
    seed([], [{ id: 'n1', title: 'Длинная', body: 'Строка текста. '.repeat(400), tagIds: [] }]);
    app.renderAll();
    app.openNoteView('n1');

    const view = document.getElementById('noteView');
    const head = view.querySelector('.nv-head');
    const scroll = view.querySelector('.nv-scroll');
    ok(head, 'шапка есть');
    ok(scroll, 'прокручиваемая область есть');
    strictEqual(scroll.contains(head), false, 'шапка не прокручивается вместе с текстом');
    ok(head.querySelector('#noteViewClose'), 'кнопка «Закрыть» в шапке');
    ok(head.querySelector('#noteViewEdit'), 'кнопка «Редактировать» в шапке');
    ok(scroll.querySelector('.nv-body'), 'текст заметки внутри области прокрутки');
  });

  test('просмотр рендерит Markdown и экранирует HTML', () => {
    seed([], [{
      id: 'n1',
      title: '<b>опасный</b>',
      body: '# Заголовок\n\n<script>alert(1)</script>',
      tagIds: []
    }]);
    app.renderAll();
    app.openNoteView('n1');

    const view = document.getElementById('noteView');
    ok(view.querySelector('.md-h1'), 'заголовок Markdown отрендерен');
    ok(view.querySelector('.nv-body .md-gap'), 'пустая строка между абзацами сохранена');
    strictEqual(view.querySelector('script'), null, 'скрипт не выполняется и не вставляется');
    ok(view.querySelector('.nv-title').textContent.indexOf('<b>опасный</b>') !== -1, 'заголовок выведен как текст');
  });

  test('двойной клик и кнопка «Редактировать» открывают редактор', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.renderAll();

    document.querySelector('#notes .note-card').dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
    ok(document.getElementById('modalMask').classList.contains('show'), 'двойной клик открыл редактор');
    strictEqual(document.getElementById('fTitle').value, 'Заметка');
    app.closeEditor();

    app.openNoteView('n1');
    document.querySelector('#noteView .nv-edit').click();
    ok(document.getElementById('modalMask').classList.contains('show'), 'кнопка открыла редактор');
    app.closeEditor();
  });

  test('просмотр закрывается кнопкой и клавишей Esc', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.renderAll();
    const split = document.getElementById('contentSplit');

    app.openNoteView('n1');
    ok(split.classList.contains('has-view'));
    document.getElementById('noteViewClose').click();
    strictEqual(app.viewingId, null);
    strictEqual(split.classList.contains('has-view'), false);

    app.openNoteView('n1');
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    strictEqual(app.viewingId, null, 'Esc закрыл просмотр');
  });

  test('сохранение из редактора обновляет открытый просмотр', () => {
    seed([], [{ id: 'n1', title: 'Старое имя', body: 'текст', tagIds: [] }]);
    app.renderAll();
    app.openNoteView('n1');
    document.querySelector('#noteView .nv-edit').click();
    document.getElementById('fTitle').value = 'Новое имя';
    app.saveNote();

    strictEqual(app.viewingId, 'n1', 'просмотр остался открыт');
    strictEqual(document.querySelector('#noteView .nv-title').textContent, 'Новое имя');
  });

  test('удаление заметки закрывает просмотр', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.renderAll();
    app.openNoteView('n1');

    app.state.notes = app.state.notes.filter(n => n.id !== 'n1');
    app.renderAll();

    strictEqual(app.viewingId, null);
    strictEqual(document.getElementById('contentSplit').classList.contains('has-view'), false);
  });

  test('клик по тэгу в просмотре уводит в папку и закрывает его', () => {
    seed([{ id: 't1', name: 'работа' }], [{ id: 'n1', title: 'x', body: 'y', tagIds: ['t1'] }]);
    app.renderAll();
    app.openNoteView('n1');

    document.querySelector('#noteView .nv-tags .tag').click();
    deepEqual(app.currentPath, ['работа']);
    strictEqual(app.viewingId, null);
  });

  test('смена папки закрывает просмотр', () => {
    seed(
      [{ id: 't1', name: 'работа' }],
      [{ id: 'n1', title: 'x', body: 'y', tagIds: [] }]
    );
    app.renderAll();
    app.openNoteView('n1');
    app.goToPath(['работа']);
    strictEqual(app.viewingId, null);
  });

  test('поиск закрывает просмотр', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.renderAll();
    app.openNoteView('n1');

    app.onSearch('Заметка');
    strictEqual(app.viewingId, null);
    strictEqual(document.getElementById('contentSplit').classList.contains('has-view'), false);
  });

  test('resetNavigation закрывает просмотр', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.renderAll();
    app.openNoteView('n1');

    app.resetNavigation();
    strictEqual(app.viewingId, null);
    app.renderAll();
    strictEqual(document.getElementById('contentSplit').classList.contains('has-view'), false);
  });

  test('renderAll({ noteView: false }) не пересобирает панель', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.renderAll();
    app.openNoteView('n1');
    const title = document.querySelector('#noteView .nv-title');
    title.textContent = 'МАРКЕР';

    app.renderAll({ noteView: false });
    strictEqual(document.querySelector('#noteView .nv-title').textContent, 'МАРКЕР', 'панель не тронута');

    app.renderAll();
    strictEqual(document.querySelector('#noteView .nv-title').textContent, 'Заметка', 'обычный renderAll обновляет панель');
  });

  test('openNoteView с неизвестным id ничего не открывает', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.renderAll();

    app.openNoteView('нет-такой');
    strictEqual(app.viewingId, null);
    strictEqual(document.getElementById('contentSplit').classList.contains('has-view'), false);
  });
});

// Минимальная фейковая IndexedDB для тестов: поддерживает ровно тот API,
// которым пользуется слой хранения (open/transaction/get/put/delete).
function makeFakeIdb(initial) {
  const data = new Map(Object.entries(initial || {}));
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => {},
    transaction: () => {
      const tx = { oncomplete: null, onerror: null, onabort: null };
      const store = {
        get(key) {
          const rq = {};
          queueMicrotask(() => { rq.result = data.get(key); if (rq.onsuccess) rq.onsuccess(); });
          return rq;
        },
        put(value, key) { data.set(key, value); return {}; },
        delete(key) { data.delete(key); return {}; }
      };
      tx.objectStore = () => store;
      // Завершение транзакции — отдельной задачей, после microtask-колбэков get().
      setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0);
      return tx;
    },
    close() {}
  };
  return {
    open() {
      const req = {};
      setTimeout(() => { req.result = db; if (req.onsuccess) req.onsuccess(); }, 0);
      return req;
    },
    _data: data
  };
}

describe('Хранилище: IndexedDB для тяжёлых данных', () => {
  const HEAVY = 'noteTreeData_v1';
  const THEME = 'noteTreeTheme';

  test('без IndexedDB storageInit возвращает false, тяжёлые ключи идут в localStorage', async () => {
    strictEqual(await app.storageInit(), false);
    strictEqual(app.idbMode, false);
    app.storageSet(HEAVY, 'payload');
    strictEqual(window.localStorage.getItem(HEAVY), 'payload');
  });

  test('storageInit переносит тяжёлые ключи из localStorage в базу', async () => {
    const payload = JSON.stringify({ version: 2, tags: [], notes: [{ id: 'n1', title: 'Перенесённая', tagIds: [] }] });
    window.localStorage.setItem(HEAVY, payload);
    window.localStorage.setItem(THEME, 'dark');
    const fake = makeFakeIdb();
    window.indexedDB = fake;

    strictEqual(await app.storageInit(), true);
    strictEqual(app.idbMode, true);
    strictEqual(app.storageGet(HEAVY), payload);
    strictEqual(window.localStorage.getItem(HEAVY), null, 'копия убрана из localStorage');
    strictEqual(fake._data.get(HEAVY), payload);
    strictEqual(window.localStorage.getItem(THEME), 'dark', 'настройки остались в localStorage');
  });

  test('в режиме базы тяжёлые ключи не пишутся в localStorage', async () => {
    const fake = makeFakeIdb();
    window.indexedDB = fake;
    await app.storageInit();

    app.storageSet(HEAVY, 'x'.repeat(1000));
    await app.idbIdle();

    strictEqual(window.localStorage.getItem(HEAVY), null);
    strictEqual(fake._data.get(HEAVY).length, 1000);
  });

  test('лёгкие ключи по-прежнему пишутся в localStorage', async () => {
    const fake = makeFakeIdb();
    window.indexedDB = fake;
    await app.storageInit();

    app.storageSet(THEME, 'light');
    strictEqual(window.localStorage.getItem(THEME), 'light');
    strictEqual(fake._data.has(THEME), false);
  });

  test('loadState читает заметки из базы', async () => {
    const fake = makeFakeIdb({
      [HEAVY]: JSON.stringify({
        version: 2,
        tags: [{ id: 't1', name: 'работа' }],
        notes: [{ id: 'n1', title: 'Из базы', tagIds: ['t1'], created: 1, updated: 2 }]
      })
    });
    window.indexedDB = fake;
    await app.storageInit();
    app.loadState();

    strictEqual(app.state.notes.length, 1);
    strictEqual(app.state.notes[0].title, 'Из базы');
    deepEqual(app.tagsOf(app.state.notes[0]), ['работа']);
  });

  test('снимки и корзина сохраняются в базу, а не в localStorage', async () => {
    const fake = makeFakeIdb();
    window.indexedDB = fake;
    await app.storageInit();
    app.state.notes = app.applyData({ tags: [], notes: [{ id: 'n1', title: 'Снимок', tagIds: [] }] });

    app.maybeSnapshot(true);
    app.moveToTrash(app.state.notes[0]);
    await app.idbIdle();

    ok(fake._data.get('noteTreeSnapshots'), 'снимок в базе');
    strictEqual(JSON.parse(fake._data.get('noteTreeSnapshots')).length, 1);
    ok(fake._data.get('noteTreeTrash'), 'корзина в базе');
    strictEqual(window.localStorage.getItem('noteTreeSnapshots'), null);
    strictEqual(window.localStorage.getItem('noteTreeTrash'), null);
  });

  test('storageProbe показывает режим IndexedDB и число заметок', async () => {
    const fake = makeFakeIdb({
      [HEAVY]: JSON.stringify({ version: 2, tags: [], notes: [{ id: 'n1', title: 'a', tagIds: [] }, { id: 'n2', title: 'b', tagIds: [] }] })
    });
    window.indexedDB = fake;
    await app.storageInit();

    const p = app.storageProbe();
    strictEqual(p.idbMode, true);
    strictEqual(p.savedCount, 2);
  });

  test('сбой записи при миграции не прячет данные: они остаются в памяти', async () => {
    const payload = JSON.stringify({ version: 2, tags: [], notes: [{ id: 'n1', title: 'Не потерялась', tagIds: [] }] });
    window.localStorage.setItem(HEAVY, payload);
    const fake = makeFakeIdb();
    // Запись в базу падает — данные должны остаться доступными в сессии.
    fake.open = () => {
      const req = {};
      setTimeout(() => {
        const db = {
          objectStoreNames: { contains: () => true },
          createObjectStore: () => {},
          close: () => {},
          transaction: () => {
            const tx = { oncomplete: null, onerror: null, onabort: null, error: new Error('запись запрещена') };
            tx.objectStore = () => ({
              get(key) { const rq = {}; queueMicrotask(() => { rq.result = undefined; if (rq.onsuccess) rq.onsuccess(); }); return rq; },
              put() { setTimeout(() => { if (tx.onerror) tx.onerror(); }, 0); return {}; }
            });
            setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0);
            return tx;
          }
        };
        req.result = db;
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    };
    window.indexedDB = fake;
    await app.storageInit().catch(() => {});
    // Дать отработать фоновой записи и её ошибке.
    await new Promise(r => setTimeout(r, 20));

    if (app.idbMode) strictEqual(app.storageGet(HEAVY), payload);
    else strictEqual(window.localStorage.getItem(HEAVY), payload);
    strictEqual(app.idbMode, true, 'база открылась — значит читаем именно из памяти');
  });
});

// Фейковая IndexedDB, у которой первые N записей падают: проверяем повторы.
function makeFlakyIdb(failCount) {
  const data = new Map();
  let puts = 0;
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => {},
    close: () => {},
    transaction(_store, mode) {
      const tx = { oncomplete: null, onerror: null, onabort: null, error: null };
      const store = {
        get(key) {
          const rq = {};
          queueMicrotask(() => { rq.result = data.get(key); if (rq.onsuccess) rq.onsuccess(); });
          if (mode === 'readonly') setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0);
          return rq;
        },
        put(value, key) {
          puts++;
          if (puts <= failCount) {
            setTimeout(() => { tx.error = new Error('временный сбой'); if (tx.onerror) tx.onerror(); }, 0);
          } else {
            data.set(key, value);
            setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0);
          }
          return {};
        },
        delete(key) { data.delete(key); setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0); }
      };
      tx.objectStore = () => store;
      return tx;
    }
  };
  return {
    open() {
      const req = {};
      setTimeout(() => { req.result = db; if (req.onsuccess) req.onsuccess(); }, 0);
      return req;
    },
    _data: data
  };
}

describe('Хранилище: надёжность записи', () => {
  const HEAVY = 'noteTreeData_v1';

  test('повреждённый JSON восстанавливается из резервной копии', () => {
    window.localStorage.setItem(HEAVY, '{"version":2,"notes":[');
    window.localStorage.setItem(HEAVY + '_backup', JSON.stringify({
      version: 2, tags: [], notes: [{ id: 'n1', title: 'Из резерва', body: 'текст', tagIds: [] }]
    }));

    app.loadState();

    strictEqual(app.state.notes.length, 1);
    strictEqual(app.state.notes[0].title, 'Из резерва');
    strictEqual(app.storageProbe().recovered, 'backup');
  });

  test('если резерв тоже битый — берём последний снимок', () => {
    window.localStorage.setItem(HEAVY, 'null');
    window.localStorage.setItem(HEAVY + '_backup', '[] не json');
    app.saveSnapshots([{
      ts: 1, sig: '1:n5', count: 1,
      data: { tags: [], notes: [{ id: 'n5', title: 'Из снимка', tagIds: [] }] }
    }]);

    app.loadState();

    strictEqual(app.state.notes.length, 1);
    strictEqual(app.state.notes[0].title, 'Из снимка');
    strictEqual(app.storageProbe().recovered, 'snapshot');
  });

  test('исправные данные не помечаются как восстановленные', () => {
    window.localStorage.setItem(HEAVY, JSON.stringify({
      version: 2, tags: [], notes: [{ id: 'n1', title: 'Целые', tagIds: [] }]
    }));
    app.loadState();
    strictEqual(app.state.notes[0].title, 'Целые');
    strictEqual(app.storageProbe().recovered, '');
  });

  test('список снимков кэшируется и не перечитывается из хранилища', () => {
    app.saveSnapshots([{ ts: 1, sig: '1:a', count: 1, data: { tags: [], notes: [] } }]);
    const first = app.loadSnapshots();
    const second = app.loadSnapshots();
    strictEqual(first, second, 'тот же массив из памяти');
    strictEqual(JSON.parse(window.localStorage.getItem('noteTreeSnapshots')).length, 1);
  });

  test('корзина кэшируется и сохраняется с ограничением', () => {
    const items = [];
    for (let i = 0; i < 25; i++) items.push({ deleted: i, note: { id: 'n' + i, title: 't', tagIds: [] } });
    app.saveTrash(items);
    const first = app.loadTrash();
    const second = app.loadTrash();
    strictEqual(first, second, 'тот же массив из памяти');
    strictEqual(first.length, 20, 'корзина обрезана до 20');
  });

  test('сбой записи в базу повторяется и данные доходят', async () => {
    const fake = makeFlakyIdb(2); // первые две записи падают
    window.indexedDB = fake;
    strictEqual(await app.storageInit(), true);
    app.state.notes = app.applyData({ tags: [], notes: [{ id: 'n1', title: 'Повтор', tagIds: [] }] });

    app.saveState();
    await app.idbIdle();

    ok(fake._data.has(HEAVY), 'запись дошла после повторов');
    strictEqual(JSON.parse(fake._data.get(HEAVY)).notes[0].title, 'Повтор');
  });

  test('при нехватке места сначала удаляются старые снимки', () => {
    const snaps = [];
    for (let i = 0; i < 5; i++) snaps.push({ ts: i, sig: i + ':a', count: 1, data: { tags: [], notes: [] } });
    app.saveSnapshots(snaps);
    app.saveTrash([{ deleted: 1, note: { id: 'n1', title: 't', tagIds: [] } }]);

    strictEqual(app.relieveQuota(), true);
    strictEqual(app.loadSnapshots().length, 2, 'осталась половина снимков');
    strictEqual(app.loadTrash().length, 1, 'корзину пока не трогали');
  });

  test('withTimeout не ждёт зависшую инициализацию', async () => {
    await assert.rejects(
      app.withTimeout(new Promise(() => {}), 20, 'таймаут базы'),
      /таймаут базы/
    );
  });

  test('старт приложения не уходит в аварийный экран', () => {
    // Ловит опечатки вроде необъявленной переменной на пути startApp():
    // раньше приложение показывало renderFatal, а тесты этого не замечали.
    const notes = document.getElementById('notes');
    strictEqual(notes.textContent.indexOf('Не удалось запустить приложение'), -1);
    ok(document.querySelector('#tree'), 'дерево отрисовано');
    ok(document.getElementById('search'), 'панель поиска на месте');
  });
});
