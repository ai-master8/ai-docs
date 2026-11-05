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

  test('область «В папке» ограничивает поиск текущей веткой', () => {
    seed(
      [{ id: 't1', name: 'a' }, { id: 't2', name: 'b' }],
      [
        { id: 'n1', title: 'Общая', body: 'текст', tagIds: ['t1'] },
        { id: 'n2', title: 'Общая', body: 'текст', tagIds: ['t2'] }
      ]
    );
    app.currentPath = ['a'];
    app.onSearch('общая');
    strictEqual(document.querySelectorAll('#notes .note-card').length, 2);
    app.setSearchScope('folder');
    strictEqual(document.querySelectorAll('#notes .note-card').length, 1);
    strictEqual(document.querySelector('#notes .note-card').dataset.noteId, 'n1');
    strictEqual(document.getElementById('searchScope').querySelector('.scope-btn[data-scope="folder"]').classList.contains('active'), true);
    app.setSearchScope('all');
    strictEqual(document.querySelectorAll('#notes .note-card').length, 2);
  });

  test('область «В папке» недоступна в корне', () => {
    seed([], [{ id: 'n1', title: 'Без тэга', tagIds: [] }]);
    app.renderAll();
    const btn = document.querySelector('#searchScope .scope-btn[data-scope="folder"]');
    strictEqual(btn.disabled, true);
    strictEqual(btn.classList.contains('active'), false);
  });

  test('кнопка очистки поиска появляется при запросе и сбрасывает его', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    const clear = document.getElementById('searchClear');
    strictEqual(clear.hidden, true);
    app.onSearch('заметка');
    strictEqual(clear.hidden, false);
    clear.click();
    strictEqual(document.getElementById('search').value, '');
    strictEqual(clear.hidden, true);
    strictEqual(document.querySelectorAll('#notes .note-card').length, 1);
  });

  test('пустая выдача поиска предлагает сбросить поиск', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.onSearch('нет-такого');
    const box = document.querySelector('#notes .empty');
    ok(box && box.textContent.includes('Ничего не найдено'));
    const reset = box.querySelector('#emptyResetBtn');
    ok(reset, 'кнопка сброса отрендерена');
    reset.click();
    strictEqual(document.getElementById('search').value, '');
    strictEqual(document.querySelectorAll('#notes .note-card').length, 1);
  });

  test('в результатах поиска виден путь и кнопка перехода в дерево', () => {
    seed(
      [{ id: 't1', name: 'a' }, { id: 't2', name: 'b' }],
      [{ id: 'n1', title: 'Найдено', body: 'текст', tagIds: ['t1', 't2'] }]
    );
    app.onSearch('найдено');
    const path = document.querySelector('#notes .note-path');
    ok(path, 'строка пути отрендерена');
    ok(path.textContent.includes('a / b'));
    app.collapseAllTree();
    path.querySelector('.np-show').click();
    deepEqual(app.currentPath, ['a', 'b']);
    strictEqual(document.getElementById('search').value, '');
    ok(document.querySelector('#tree .node-row[data-path="a/b"]'), 'ветка раскрыта в дереве');
  });
});

describe('Быстрый переход (Ctrl+K)', () => {
  test('открывается по Ctrl+K и группирует команды, тэги и заметки', () => {
    seed(
      [{ id: 't1', name: 'работа' }],
      [{ id: 'n1', title: 'План проекта', body: 'текст', tagIds: ['t1'] }]
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    const mask = document.getElementById('paletteMask');
    strictEqual(mask.classList.contains('show'), true);
    const input = document.getElementById('paletteInput');
    input.value = '#раб';
    app.renderPalette();
    const groups = [...document.querySelectorAll('#paletteList .palette-group')].map(e => e.textContent);
    deepEqual(groups, ['Папки и тэги']);
    const item = document.querySelector('#paletteList .palette-item');
    ok(item && item.textContent.includes('#работа'));
    item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    strictEqual(mask.classList.contains('show'), false);
    deepEqual(app.currentPath, ['работа']);
  });

  test('префикс @ ищет заметки по заголовку и тэгам', () => {
    seed(
      [{ id: 't1', name: 'работа' }],
      [{ id: 'n1', title: 'План проекта', body: 'текст', tagIds: ['t1'] }]
    );
    app.openPalette();
    document.getElementById('paletteInput').value = '@план';
    app.renderPalette();
    const items = [...document.querySelectorAll('#paletteList .palette-item')];
    ok(items.some(it => it.textContent.includes('План проекта')));
    ok(items.every(it => !it.textContent.includes('🏷️')));
    app.closePalette();
  });
});

describe('Клавиатурная навигация по спискам', () => {
  test('палитра: стрелки выбирают пункт, Enter запускает его', () => {
    seed([{ id: 't1', name: 'работа' }], []);
    app.openPalette();
    const input = document.getElementById('paletteInput');
    input.value = '#раб';
    app.renderPalette();
    const item = document.querySelector('#paletteList .palette-item');
    ok(item, 'пункт найден');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    strictEqual(item.classList.contains('active'), true, 'первый пункт стал активным');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    strictEqual(document.getElementById('paletteMask').classList.contains('show'), false, 'палитра закрылась');
    deepEqual(app.currentPath, ['работа']);
  });

  test('автодополнение тэгов: стрелка вниз выбирает первую подсказку', () => {
    seed([{ id: 't1', name: 'работа' }], []);
    app.openEditor();
    const input = document.getElementById('fTags');
    input.value = 'раб';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const item = document.querySelector('#tagSuggest .ts');
    ok(item, 'подсказка показана');
    strictEqual(item.classList.contains('active'), false);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    strictEqual(item.classList.contains('active'), true);
    app.closeEditor({ silent: true });
  });

  test('подсказки поиска: стрелка и Enter подставляют тэг', () => {
    seed([{ id: 't1', name: 'работа' }], []);
    app.renderAll();
    const input = document.getElementById('search');
    input.value = '#раб';
    app.updateSearchSuggest();
    const item = document.querySelector('#searchSuggest .sugg');
    ok(item, 'подсказка показана');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    strictEqual(item.classList.contains('active'), true);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    ok(input.value.indexOf('#работа') === 0, 'тэг подставлен в поле');
    strictEqual(document.getElementById('searchSuggest').classList.contains('show'), false);
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

  test('после сохранения новая заметка открывается в просмотре', () => {
    app.currentPath = [];
    app.openEditor();
    document.getElementById('fTitle').value = 'Свежая заметка';
    document.getElementById('fBody').value = 'Текст';
    app.saveNote();
    strictEqual(app.editorOpen, false, 'редактор закрыт');
    ok(app.viewingId, 'заметка выбрана');
    strictEqual(document.getElementById('contentSplit').classList.contains('has-editor'), false);
    strictEqual(document.querySelector('#noteView .nv-title').textContent, 'Свежая заметка');
  });

  test('редактор открывается в правой панели, список остаётся на месте', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.renderAll();
    app.openEditor('n1');
    const split = document.getElementById('contentSplit');
    ok(split.classList.contains('has-editor'), 'включён режим редактора');
    ok(split.classList.contains('has-view'), 'панель занимает правую часть');
    ok(document.querySelector('#notes .note-card'), 'список заметок не скрыт');
    strictEqual(document.querySelector('#editorView #fTitle').value, 'Заметка');
    strictEqual(document.getElementById('editorDirtyMark').hidden, true, 'без правок индикатор скрыт');

    document.getElementById('fTitle').value = 'Изменено';
    document.getElementById('fTitle').dispatchEvent(new window.Event('input', { bubbles: true }));
    strictEqual(app.editorDirty(), true);
    strictEqual(document.getElementById('editorDirtyMark').hidden, false, 'индикатор показал правки');
    app.closeEditor();
  });

  test('переименование тэга обновляет открытый редактор и не воскрешает старое имя', () => {
    seed([{ id: 't1', name: 'a' }], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: ['t1'] }]);
    app.renderAll();
    app.openEditor('n1');
    app.renameTag('a', 'b');
    const badges = [...document.querySelectorAll('#tagBadges .tag-badge')].map(b => b.textContent);
    ok(badges.some(t => t.includes('b')), 'бейдж показывает новое имя');
    app.saveNote();
    ok(!app.state.tags.some(t => t.name === 'a'), 'старое имя не вернулось в таблицу');
    ok(app.state.tags.some(t => t.name === 'b'), 'новое имя сохранено');
  });

  test('отмена редактирования возвращает к просмотру заметки', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.renderAll();
    app.openEditor('n1');
    app.closeEditor();
    strictEqual(app.editorOpen, false);
    strictEqual(app.viewingId, 'n1', 'просмотр остаётся открытым');
    strictEqual(document.getElementById('contentSplit').classList.contains('has-editor'), false);
    strictEqual(document.querySelector('#noteView .nv-title').textContent, 'Заметка');
  });

  test('Esc закрывает редактор без изменений', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.renderAll();
    app.openEditor('n1');
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    strictEqual(app.editorOpen, false);
    strictEqual(app.viewingId, 'n1');
  });

  test('отмена перехода в поиск возвращает редактор и прежний запрос', async () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: [] }]);
    app.renderAll();
    app.openEditor('n1');
    document.getElementById('fTitle').value = 'Изменено';
    document.getElementById('search').value = 'текст';
    app.onSearch('текст');
    ok(document.getElementById('dialogMask').classList.contains('show'), 'показан диалог');
    document.getElementById('dialogCancelBtn').click();
    await Promise.resolve();
    strictEqual(app.editorOpen, true, 'редактор остался открыт');
    strictEqual(document.getElementById('search').value, '', 'поле вернулось к прежнему запросу');
  });

  test('уход из редактора с несохранёнными правками требует подтверждения', async () => {
    seed([{ id: 't1', name: 'a' }], [{ id: 'n1', title: 'Заметка', body: 'текст', tagIds: ['t1'] }]);
    app.renderAll();
    app.openEditor('n1');
    document.getElementById('fTitle').value = 'Изменено';
    ok(app.editorDirty());

    app.goToPath([]);
    ok(document.getElementById('dialogMask').classList.contains('show'), 'показан диалог');
    document.getElementById('dialogCancelBtn').click();
    await Promise.resolve();

    deepEqual(app.currentPath, [], 'отмена оставила прежнюю папку');
    strictEqual(app.editorOpen, true, 'редактор не закрыт');

    app.goToPath(['a']);
    document.getElementById('dialogOkBtn').click();
    await Promise.resolve();

    deepEqual(app.currentPath, ['a'], 'подтверждение перешло в папку');
    strictEqual(app.editorOpen, false, 'редактор закрыт после подтверждения');
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

describe('Тэги новой заметки и рейтинг', () => {
  test('новая заметка в папке создаётся без тэгов', () => {
    seed([{ id: 't1', name: 'работа' }], [{ id: 'n1', title: 'Старая', tagIds: ['t1'] }]);
    app.currentPath = ['работа'];
    app.openEditor();
    strictEqual(document.querySelectorAll('#tagBadges .tag-badge').length, 0, 'бейджей тэгов нет');
    document.getElementById('fTitle').value = 'Новая';
    app.saveNote();
    const created = app.state.notes.find(n => n.title === 'Новая');
    ok(created, 'заметка создана');
    deepEqual(created.tagIds, [], 'тэги папки не унаследованы');
  });

  test('рейтинг ставится звёздами, сохраняется и рисуется в карточке и просмотре', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: '', tagIds: [] }]);
    app.renderAll();
    app.openEditor('n1');
    const btns = [...document.querySelectorAll('#fRating .star-btn')];
    strictEqual(btns.length, 5, 'пять звёзд в редакторе');
    btns[3].click(); // четвёртая звезда
    strictEqual(app.editorRating, 4);
    strictEqual(app.editorDirty(), true, 'смена рейтинга — это правка');
    app.saveNote();
    strictEqual(app.state.notes.find(n => n.id === 'n1').rating, 4);
    strictEqual(document.querySelectorAll('#notes .note-card .stars .star.on').length, 4);
    strictEqual(document.querySelectorAll('#noteView .nv-rating .star.on').length, 4);
  });

  test('повторный клик по той же звезде сбрасывает оценку', () => {
    seed([], [{ id: 'n1', title: 'Заметка', tagIds: [], rating: 3 }]);
    app.renderAll();
    app.openEditor('n1');
    strictEqual(app.editorRating, 3, 'рейтинг поднят из заметки');
    document.querySelectorAll('#fRating .star-btn')[2].click();
    strictEqual(app.editorRating, 0);
    app.saveNote();
    strictEqual(app.state.notes.find(n => n.id === 'n1').rating, 0);
  });

  test('normalizeNote ограничивает рейтинг целым числом 0–5', () => {
    strictEqual(app.normalizeNote({ rating: 9 }).rating, 5);
    strictEqual(app.normalizeNote({ rating: -2 }).rating, 0);
    strictEqual(app.normalizeNote({ rating: '3' }).rating, 3);
    strictEqual(app.normalizeNote({ rating: 2.6 }).rating, 3);
    strictEqual(app.normalizeNote({}).rating, 0);
  });

  test('дублирование копирует рейтинг', () => {
    seed([], [{ id: 'n1', title: 'Заметка', tagIds: [], rating: 4 }]);
    const copy = app.duplicateNote('n1');
    strictEqual(copy.rating, 4);
  });

  test('без оценки звёзды в карточке пустые, но кликабельные', () => {
    seed([], [{ id: 'n1', title: 'Заметка', tagIds: [] }]);
    app.renderAll();
    const stars = document.querySelectorAll('#notes .note-card .stars .star');
    strictEqual(stars.length, 5);
    strictEqual(document.querySelectorAll('#notes .note-card .stars .star.on').length, 0);
    strictEqual(document.querySelectorAll('#notes .note-card .stars .star.hit').length, 5);
  });

  test('клик по звезде карточки ставит оценку, не открывая просмотр и редактор', () => {
    seed([], [{ id: 'n1', title: 'Заметка', tagIds: [] }]);
    app.renderAll();
    const card = document.querySelector('#notes .note-card');
    const stars = card.querySelectorAll('.stars .star');
    stars[3].click(); // четвёртая звезда
    strictEqual(app.state.notes[0].rating, 4);
    strictEqual(document.querySelectorAll('#notes .note-card .stars .star.on').length, 4);
    strictEqual(app.viewingId, null, 'просмотр не открылся');
    strictEqual(app.editorOpen, false, 'редактор не открылся');
    ok(document.contains(card), 'карточка не пересоздана — прокрутка сохранена');
  });

  test('повторный клик по звезде карточки сбрасывает оценку', () => {
    seed([], [{ id: 'n1', title: 'Заметка', tagIds: [], rating: 3 }]);
    app.renderAll();
    document.querySelectorAll('#notes .note-card .stars .star')[2].click();
    strictEqual(app.state.notes[0].rating, 0);
    strictEqual(document.querySelectorAll('#notes .note-card .stars .star.on').length, 0);
  });

  test('двойной клик по звезде карточки не открывает редактор', () => {
    seed([], [{ id: 'n1', title: 'Заметка', tagIds: [] }]);
    app.renderAll();
    const star = document.querySelector('#notes .note-card .stars .star');
    star.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    strictEqual(app.editorOpen, false);
  });

  test('оценка с карточки синхронизируется с открытым редактором', () => {
    seed([], [{ id: 'n1', title: 'Заметка', tagIds: [] }]);
    app.renderAll();
    app.openEditor('n1');
    document.querySelectorAll('#notes .note-card .stars .star')[4].click();
    strictEqual(app.editorRating, 5, 'редактор видит новую оценку');
    app.saveNote();
    strictEqual(app.state.notes[0].rating, 5, 'сохранение не вернуло старую оценку');
  });

  test('при сортировке по оценке карточки перестраиваются сразу', () => {
    seed([], [
      { id: 'n1', title: 'A', tagIds: [] },
      { id: 'n2', title: 'B', tagIds: [] }
    ]);
    app.setSortMode('rating');
    app.renderAll();
    strictEqual(document.querySelector('#notes .note-card').dataset.noteId, 'n1');
    // Оцениваем вторую карточку — она должна подняться наверх.
    const cards = document.querySelectorAll('#notes .note-card');
    cards[1].querySelectorAll('.stars .star')[4].click();
    strictEqual(document.querySelector('#notes .note-card').dataset.noteId, 'n2');
  });
});

describe('Оценка: поиск, клавиатура и меню', () => {
  test('parseQuery понимает rating: с операторами и none', () => {
    deepEqual(app.parseQuery('rating:>=4').rating, [{ op: '>=', value: 4 }]);
    deepEqual(app.parseQuery('rating:3').rating, [{ op: '=', value: 3 }]);
    deepEqual(app.parseQuery('rating:none').rating, [{ op: '=', value: 0 }]);
    deepEqual(app.parseQuery('rating:9').rating, [{ op: '=', value: 5 }], 'значение ограничивается 0–5');
    deepEqual(app.parseQuery('rating:abc').rating, [], 'невалидный токен не ломает разбор');
  });

  test('matchesSearch фильтрует по рейтингу', () => {
    seed([], [
      { id: 'n1', title: 'Пять', tagIds: [], rating: 5 },
      { id: 'n2', title: 'Три', tagIds: [], rating: 3 },
      { id: 'n3', title: 'Ноль', tagIds: [] }
    ]);
    const ids = (q) => { app.onSearch(q); return app.searchScopeNotes().map(n => n.id); };
    deepEqual(ids('rating:>=4'), ['n1']);
    deepEqual(ids('rating:<3'), ['n3']);
    deepEqual(ids('rating:0'), ['n3']);
    deepEqual(ids('rating:none'), ['n3']);
    deepEqual(ids('rating:>=2 rating:<=3'), ['n2'], 'условия складываются по «И»');
  });

  test('клавиши 1–5 и 0 ставят и сбрасывают оценку на карточке в фокусе', () => {
    seed([], [{ id: 'n1', title: 'Заметка', tagIds: [] }]);
    app.renderAll();
    const card = document.querySelector('#notes .note-card');
    card.focus();
    card.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }));
    strictEqual(app.state.notes[0].rating, 4);
    // Список мог пересобраться (если включена сортировка по оценке) —
    // берём актуальную карточку, на которой остался фокус.
    const after = document.querySelector('#notes .note-card');
    ok(after.contains(document.activeElement) || after === document.activeElement, 'фокус остался на карточке');
    after.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
    strictEqual(app.state.notes[0].rating, 0);
    strictEqual(app.viewingId, null, 'просмотр не открылся');
  });

  test('в контекстном меню заметки есть подменю оценки', () => {
    seed([], [{ id: 'n1', title: 'Заметка', tagIds: [] }]);
    app.renderAll();
    const card = document.querySelector('#notes .note-card');
    card.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }));
    const ratingItem = [...document.querySelectorAll('#ctxMenu .ctx-item')].find(el => el.textContent.indexOf('★ Оценка') === 0);
    ok(ratingItem, 'пункт «★ Оценка» есть');
    ratingItem.click();
    const five = [...document.querySelectorAll('#ctxMenu .ctx-item')].find(el => el.textContent.indexOf('★★★★★') === 0);
    ok(five, 'подменю с пятью звёздами открыто');
    five.click();
    strictEqual(app.state.notes[0].rating, 5);
  });

  test('печать рендерит Markdown: списки и выделение сохраняются', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: '- пункт\n\n**жирный**', tagIds: [] }]);
    const orig = window.print;
    window.print = () => {};
    try { app.printNotes(app.state.notes); } finally { window.print = orig; }
    const body = document.querySelector('#printArea .print-body');
    ok(body.querySelector('ul.md-ul li'), 'список отрендерен');
    ok(body.querySelector('strong'), 'жирный текст сохранён');
    strictEqual(body.textContent.includes('**'), false, 'разметка не остаётся текстом');
  });

  test('сохранение из редактора меняет updated только при правке содержимого', () => {
    seed([], [{ id: 'n1', title: 'Заметка', body: '', tagIds: [], rating: 0, updated: 1000 }]);
    app.renderAll();
    app.openEditor('n1');
    document.querySelectorAll('#fRating .star-btn')[4].click();
    app.saveNote();
    strictEqual(app.state.notes[0].updated, 1000, 'оценка не обновляет дату');
    app.openEditor('n1');
    document.getElementById('fBody').value = 'новый текст';
    app.saveNote();
    ok(app.state.notes[0].updated > 1000, 'правка текста обновляет дату');
  });
});

describe('Задачи, фасеты и представления', () => {
  test('клик по задаче в просмотре переключает её и сохраняет заметку', () => {
    seed([], [{ id: 'n1', title: 'Дела', body: '- [ ] один\n- [ ] два', tagIds: [], updated: 500 }]);
    app.renderAll();
    app.openNoteView('n1');
    const items = document.querySelectorAll('#noteView .nv-body .md-ul.todo li[data-task]');
    strictEqual(items.length, 2);
    strictEqual(items[0].getAttribute('role'), 'checkbox');
    strictEqual(items[0].getAttribute('aria-checked'), 'false');
    items[0].click();
    strictEqual(app.state.notes[0].body, '- [x] один\n- [ ] два');
    ok(app.state.notes[0].updated > 500, 'дата обновлена');
    strictEqual(app.state.notes[0].history.length, 1, 'прежняя версия в истории');
    strictEqual(document.querySelectorAll('#noteView .md-ul.todo li[data-task]')[0].getAttribute('aria-checked'), 'true');
  });

  test('задачу можно переключить с клавиатуры (Space)', () => {
    seed([], [{ id: 'n1', title: 'Дела', body: '- [x] готово', tagIds: [] }]);
    app.renderAll();
    app.openNoteView('n1');
    const item = document.querySelector('#noteView .nv-body .md-ul.todo li[data-task]');
    item.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    strictEqual(app.state.notes[0].body, '- [ ] готово');
  });

  test('чип оценки в фасетах включает и снимает фильтр', () => {
    seed([], [
      { id: 'n1', title: 'Пять', tagIds: [], rating: 5 },
      { id: 'n2', title: 'Два', tagIds: [], rating: 2 }
    ]);
    app.renderFacets();
    const chip = [...document.querySelectorAll('#facetsBody .facets-rating .facet')].find(el => el.textContent === '★ 4+');
    ok(chip, 'чип «★ 4+» есть');
    chip.click();
    strictEqual(app.searchQuery, 'rating:>=4');
    deepEqual(app.searchScopeNotes().map(n => n.id), ['n1']);
    const again = [...document.querySelectorAll('#facetsBody .facets-rating .facet')].find(el => el.textContent === '★ 4+');
    again.click();
    strictEqual(app.searchQuery, '', 'повторный клик снимает фильтр');
  });

  test('pinned:true в поиске оставляет только закреплённые', () => {
    seed([], [
      { id: 'n1', title: 'Важная', tagIds: [], pinned: true },
      { id: 'n2', title: 'Обычная', tagIds: [] }
    ]);
    strictEqual(app.parseQuery('pinned:true').pinned, true);
    app.onSearch('pinned:true');
    deepEqual(app.searchScopeNotes().map(n => n.id), ['n1']);
    app.onSearch('pinned:false');
    deepEqual(app.searchScopeNotes().map(n => n.id), ['n2']);
  });

  test('представление восстанавливает сортировку и область поиска', () => {
    seed([{ id: 't1', name: 'a' }], [{ id: 'n1', title: 'Текст', body: 'текст', tagIds: ['t1'] }]);
    app.currentPath = ['a'];
    app.addView('Мой фильтр', 'текст', 'rating', 'folder');
    app.setSortMode('title');
    app.setSearchScope('all');
    const view = app.loadViews()[0];
    strictEqual(view.sort, 'rating');
    strictEqual(view.scope, 'folder');
    app.applyView(view);
    strictEqual(app.sortMode, 'rating', 'сортировка восстановлена');
    strictEqual(app.searchScope, 'folder', 'область восстановлена');
    strictEqual(app.searchQuery, 'текст');
  });

  test('старый формат представления (строка) продолжает работать', () => {
    seed([], [{ id: 'n1', title: 'Текст', body: 'текст', tagIds: [] }]);
    app.applyView('текст');
    strictEqual(app.searchQuery, 'текст');
    strictEqual(app.searchScope, 'all');
    strictEqual(app.searchScopeNotes().length, 1);
  });
});

describe('Внутренние ссылки и обратные ссылки', () => {
  test('renderMarkdown превращает [[Заголовок]] в безопасную ссылку', () => {
    const html = app.renderMarkdown('См. [[Другая заметка]] и [[<b>x</b>]]');
    const box = document.createElement('div');
    box.innerHTML = html;
    const links = box.querySelectorAll('a.wikilink');
    strictEqual(links.length, 2);
    strictEqual(links[0].dataset.wikilink, 'Другая заметка');
    strictEqual(links[0].textContent, 'Другая заметка');
    strictEqual(box.querySelector('b'), null, 'HTML внутри ссылки экранирован');
    const codeBox = document.createElement('div');
    codeBox.innerHTML = app.renderMarkdown('`[[Цель]]`');
    strictEqual(codeBox.querySelectorAll('a.wikilink').length, 0, 'внутри кода ссылка не создаётся');
    strictEqual(codeBox.querySelector('code').textContent, '[[Цель]]');
  });

  test('noteBacklinks находит ссылающиеся заметки без учёта регистра', () => {
    seed([], [
      { id: 'n1', title: 'Цель', tagIds: [] },
      { id: 'n2', title: 'Ссылка', body: 'см. [[цель]]', tagIds: [] },
      { id: 'n3', title: 'Другая', body: '[[Цель]] и [[Цель]]', tagIds: [] },
      { id: 'n4', title: 'Без ссылки', body: 'просто текст', tagIds: [] }
    ]);
    const back = app.noteBacklinks(app.state.notes[0]);
    deepEqual(back.map(n => n.id).sort(), ['n2', 'n3']);
    deepEqual(app.wikiLinkTitles('[[A]] x [[B]]'), ['A', 'B']);
  });

  test('openWikiLink открывает заметку в её папке', () => {
    seed([{ id: 't1', name: 'работа' }], [
      { id: 'n1', title: 'Цель', tagIds: ['t1'] },
      { id: 'n2', title: 'Ссылка', body: '[[Цель]]', tagIds: [] }
    ]);
    app.renderAll();
    app.openWikiLink('Цель');
    strictEqual(app.viewingId, 'n1');
    deepEqual(app.currentPath, ['работа']);
    strictEqual(app.searchQuery, '');
  });

  test('ссылка [[…]] кликабельна в просмотре и ведёт к заметке', () => {
    seed([], [
      { id: 'n1', title: 'Источник', body: 'Перейти: [[Цель]]', tagIds: [] },
      { id: 'n2', title: 'Цель', body: 'текст', tagIds: [] }
    ]);
    app.renderAll();
    app.openNoteView('n1');
    const link = document.querySelector('#noteView .nv-body a.wikilink');
    ok(link, 'ссылка отрендерена');
    link.click();
    strictEqual(app.viewingId, 'n2');
  });

  test('в просмотре показаны обратные ссылки', () => {
    seed([], [
      { id: 'n1', title: 'Цель', tagIds: [] },
      { id: 'n2', title: 'Источник', body: '[[Цель]]', tagIds: [] }
    ]);
    app.renderAll();
    app.openNoteView('n1');
    const items = document.querySelectorAll('#noteView .nv-backlink');
    strictEqual(items.length, 1);
    strictEqual(items[0].textContent, 'Источник');
    items[0].click();
    strictEqual(app.viewingId, 'n2');
  });
});

describe('Многоуровневая отмена и повтор', () => {
  test('undo откатывает несколько действий подряд, redo возвращает их', () => {
    seed([], [
      { id: 'n1', title: 'Первая', tagIds: [] },
      { id: 'n2', title: 'Вторая', tagIds: [] },
      { id: 'n3', title: 'Третья', tagIds: [] }
    ]);
    app.prepareUndo('удаление 1');
    app.state.notes = app.state.notes.filter(n => n.id !== 'n1');
    app.prepareUndo('удаление 2');
    app.state.notes = app.state.notes.filter(n => n.id !== 'n2');
    strictEqual(app.state.notes.length, 1);

    app.undoLastAction();
    deepEqual(app.state.notes.map(n => n.id).sort(), ['n2', 'n3']);
    app.undoLastAction();
    deepEqual(app.state.notes.map(n => n.id).sort(), ['n1', 'n2', 'n3']);
    strictEqual(app.undoLastAction(), false, 'стек пуст');

    app.redoLastAction();
    deepEqual(app.state.notes.map(n => n.id).sort(), ['n2', 'n3']);
    app.redoLastAction();
    deepEqual(app.state.notes.map(n => n.id).sort(), ['n3']);
    strictEqual(app.redoLastAction(), false, 'повторять больше нечего');
  });

  test('новое действие очищает стек повтора', () => {
    seed([], [{ id: 'n1', title: 'Одна', tagIds: [] }]);
    app.prepareUndo('удаление');
    app.state.notes = [];
    app.undoLastAction();
    app.prepareUndo('новое');
    app.state.notes = [];
    strictEqual(app.redoLastAction(), false, 'redo очищен новым действием');
  });

  test('clearUndoHistory очищает оба стека', () => {
    seed([], [{ id: 'n1', title: 'Одна', tagIds: [] }]);
    app.prepareUndo('удаление');
    app.state.notes = [];
    app.undoLastAction();
    app.clearUndoHistory();
    strictEqual(app.undoLastAction(), false);
    strictEqual(app.redoLastAction(), false);
  });
});

describe('Порционная отрисовка больших списков', () => {
  test('сначала рисуются 200 карточек, остальные — по кнопке', () => {
    const notes = Array.from({ length: 450 }, (_, i) => ({
      id: 'n' + i, title: 'Заметка ' + i, tagIds: [], updated: 1000 + i
    }));
    seed([], notes);
    app.renderAll();
    strictEqual(document.querySelectorAll('#notes .note-card').length, 200);
    const btn = document.getElementById('notesMoreBtn');
    ok(btn, 'кнопка «Показать ещё» есть');
    ok(btn.textContent.indexOf('200 из 250') !== -1, 'кнопка показывает остаток');
    btn.click();
    strictEqual(document.querySelectorAll('#notes .note-card').length, 400);
    document.getElementById('notesMoreBtn').click();
    strictEqual(document.querySelectorAll('#notes .note-card').length, 450);
    strictEqual(document.getElementById('notesMoreBtn'), null, 'кнопка исчезла');
  });

  test('смена поиска начинает порцию заново', () => {
    const notes = Array.from({ length: 450 }, (_, i) => ({
      id: 'n' + i, title: 'Заметка ' + i, body: 'общий текст', tagIds: [], updated: 1000 + i
    }));
    seed([], notes);
    app.renderAll();
    document.getElementById('notesMoreBtn').click();
    strictEqual(document.querySelectorAll('#notes .note-card').length, 400);
    app.onSearch('общий');
    strictEqual(document.querySelectorAll('#notes .note-card').length, 200);
  });
});

describe('Сортировка, экспорт и снимки', () => {
  test('сортировка по оценке: высокие выше, без оценки — в конце', () => {
    const notes = [
      { id: 'a', title: 'A', rating: 0, updated: 100 },
      { id: 'b', title: 'B', rating: 5, updated: 50 },
      { id: 'c', title: 'C', rating: 3, updated: 10 },
      { id: 'd', title: 'D', rating: 3, updated: 90 }
    ];
    deepEqual(app.sortNotes(notes, 'rating').map(n => n.id), ['b', 'd', 'c', 'a']);
  });

  test('экспорт Markdown и TXT включают оценку только у оценённых заметок', () => {
    seed([{ id: 't1', name: 'работа' }], [
      { id: 'n1', title: 'С оценкой', body: 'текст', tagIds: ['t1'], rating: 4 },
      { id: 'n2', title: 'Без оценки', body: 'текст', tagIds: [] }
    ]);
    const md = app.exportMdText(app.state.notes);
    ok(md.includes('Оценка: ★★★★☆'), 'Markdown содержит звёзды');
    strictEqual(md.split('Оценка:').length - 1, 1, 'у неоценённой строки нет');
    const txt = app.exportTxtText(app.state.notes);
    ok(txt.includes('Оценка: ★★★★☆'), 'TXT содержит звёзды');
    strictEqual(txt.split('Оценка:').length - 1, 1);
  });

  test('печать добавляет строку оценки только для оценённых', () => {
    seed([], [
      { id: 'n1', title: 'С оценкой', tagIds: [], rating: 2 },
      { id: 'n2', title: 'Без оценки', tagIds: [] }
    ]);
    const orig = window.print;
    window.print = () => {};
    try { app.printNotes(app.state.notes); } finally { window.print = orig; }
    const rows = [...document.querySelectorAll('#printArea .print-rating')].map(e => e.textContent);
    deepEqual(rows, ['Оценка: ★★☆☆☆']);
  });

  test('ручной снимок создаётся, даже если состав заметок не менялся', () => {
    seed([], [{ id: 'n1', title: 'Заметка', tagIds: [] }]);
    app.saveSnapshots([]);
    strictEqual(app.makeSnapshotNow(), true);
    strictEqual(app.loadSnapshots().length, 1);
    strictEqual(app.makeSnapshotNow(), true);
    strictEqual(app.loadSnapshots().length, 2, 'второй снимок тоже создан');
  });

  test('ручной снимок не создаётся на пустом архиве', () => {
    app.saveSnapshots([]);
    strictEqual(app.makeSnapshotNow(), false);
    strictEqual(app.loadSnapshots().length, 0);
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
    strictEqual(app.editorOpen, false, 'редактор не открылся');
    strictEqual(document.getElementById('contentSplit').classList.contains('has-editor'), false);
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
    strictEqual(app.editorOpen, false);
  });

  test('клик по бэйджу тэга раскрывает свёрнутую ветку', () => {
    seedTree();
    app.onSearch('Заметка');
    app.collapsed.add('a');
    document.querySelector('#notes .tag').click();
    deepEqual(app.currentPath, ['a']);
    strictEqual(app.collapsed.has('a'), false, 'ветка раскрыта для перехода');
  });

  test('клик по тэгу с несохранёнными правками сначала спрашивает подтверждение', async () => {
    seed([{ id: 't1', name: 'a' }], [{ id: 'n1', title: 'Заметка', tagIds: ['t1'] }]);
    app.onSearch('Заметка');
    app.openEditor('n1');
    document.getElementById('fTitle').value = 'Изменено';
    ok(app.editorDirty());
    document.querySelector('#notes .tag').click();
    ok(document.getElementById('dialogMask').classList.contains('show'), 'показан диалог');
    document.getElementById('dialogCancelBtn').click();
    await Promise.resolve();
    deepEqual(app.currentPath, [], 'отмена оставила прежнюю папку');
    strictEqual(app.editorOpen, true, 'редактор не закрыт');
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

  test('цвет тэга в просмотре берётся из таблицы тэгов', () => {
    seed([{ id: 't1', name: 'a', color: '#ff0000' }], [{ id: 'n1', title: 'x', body: '', tagIds: ['t1'] }]);
    app.renderAll();
    app.openNoteView('n1');
    const tag = document.querySelector('#noteView .nv-tags .tag');
    ok(tag, 'тэг отрендерен');
    strictEqual(tag.style.background, 'rgb(255, 0, 0)');
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
    ok(document.getElementById('contentSplit').classList.contains('has-editor'), 'двойной клик открыл редактор');
    strictEqual(app.editorOpen, true);
    strictEqual(document.getElementById('fTitle').value, 'Заметка');
    app.closeEditor();

    app.openNoteView('n1');
    document.querySelector('#noteView .nv-edit').click();
    ok(document.getElementById('contentSplit').classList.contains('has-editor'), 'кнопка открыла редактор');
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

describe('Производительность и кэши (P0)', () => {
  test('кэш поискового текста сбрасывается после переключения задачи', () => {
    seed([], [{ id: 'n1', title: 'Дело', body: '- [ ] купить хлеб', tagIds: [] }]);
    app.onSearch('[x]');
    strictEqual(app.searchScopeNotes().length, 0);
    app.toggleNoteTask('n1', 0);
    app.onSearch('[x]');
    strictEqual(app.searchScopeNotes().length, 1, 'задача отмечена — поиск видит новое тело');
    app.flushStateSave();
  });

  test('индекс заметок по id обновляется после удаления из массива', () => {
    seed([], [
      { id: 'n1', title: 'Первая', tagIds: [] },
      { id: 'n2', title: 'Вторая', tagIds: [] }
    ]);
    strictEqual(app.noteById('n2').title, 'Вторая');
    app.state.notes.splice(0, 1);
    strictEqual(app.noteById('n1'), null);
    strictEqual(app.noteById('n2').title, 'Вторая');
  });

  test('индекс обратных ссылок сбрасывается при изменении данных', () => {
    seed([], [
      { id: 'n1', title: 'Цель', tagIds: [] },
      { id: 'n2', title: 'Ссылка', body: 'без ссылки', tagIds: [] }
    ]);
    strictEqual(app.noteBacklinks(app.state.notes[0]).length, 0);
    app.state.notes[1].body = 'теперь [[Цель]]';
    app.invalidateTree();
    deepEqual(app.noteBacklinks(app.state.notes[0]).map(n => n.id), ['n2']);
  });

  test('сниппет поиска сдвигается к найденному фрагменту', () => {
    const prefix = 'начало текста '.repeat(12); // больше 140 символов
    seed([], [{ id: 'n1', title: 'Длинная', body: prefix + ' иголка в конце', tagIds: [] }]);
    app.onSearch('иголка');
    app.renderNotes();
    const preview = document.querySelector('#notes .preview');
    ok(preview.textContent.startsWith('…'), 'сниппет начинается с многоточия');
    ok(preview.textContent.includes('иголка'), 'найденный текст попал в превью');
  });

  test('отложенная запись оценки сбрасывается через flushStateSave', () => {
    seed([], [{ id: 'n1', title: 'Оценка', body: '', tagIds: [] }]);
    app.rateNoteFromCard('n1', 4);
    app.flushStateSave();
    const saved = JSON.parse(app.storageGet('noteTreeData_v1'));
    strictEqual(saved.notes[0].rating, 4);
    app.flushStateSave(); // повторный вызов безопасен
  });
});

describe('Надёжность и UX (P1)', () => {
  test('черновик редактора переживает закрытие и очищается после сохранения', () => {
    seed([], [{ id: 'n1', title: 'Черновик', body: 'старое', tagIds: [], updated: 1 }]);
    app.openEditor('n1');
    document.getElementById('fTitle').value = 'Несохранённый заголовок';
    app.scheduleDraftSave();
    app.flushDraftSave();
    ok(app.readStoredDraft(), 'черновик записан');
    app.closeEditor();
    app.openEditor('n1');
    strictEqual(document.getElementById('fTitle').value, 'Несохранённый заголовок', 'черновик восстановлен');
    strictEqual(app.editorDirty(), true, 'восстановленный черновик помечен как несохранённый');
    app.saveNote();
    strictEqual(app.storageGet('noteTreeDraft'), '', 'после сохранения черновик очищен');
  });

  test('переименование заметки обновляет [[ссылки]] в других заметках', () => {
    seed([], [
      { id: 'n1', title: 'Старое имя', body: '', tagIds: [], updated: 1 },
      { id: 'n2', title: 'Ссылка', body: 'см. [[Старое имя]]', tagIds: [], updated: 1 }
    ]);
    app.openEditor('n1');
    document.getElementById('fTitle').value = 'Новое имя';
    app.saveNote();
    strictEqual(app.noteById('n1').title, 'Новое имя');
    strictEqual(app.noteById('n2').body, 'см. [[Новое имя]]');
    strictEqual(app.noteBacklinks(app.noteById('n1'))[0].id, 'n2');
  });

  test('validateImport отсекает структурно неверные данные', () => {
    strictEqual(app.validateImport({ tags: [{ id: 't1', name: 'x' }], notes: [{ id: 'n1', title: 'a' }] }).ok, true);
    strictEqual(app.validateImport({ tags: [], notes: [{ title: [] }] }).ok, false);
    strictEqual(app.validateImport({ tags: 'x', notes: [] }).ok, false);
    strictEqual(app.validateImport([{ title: 'старый формат', tags: ['a'] }]).ok, true);
    strictEqual(app.validateImport({ notes: 'nope' }).ok, false);
  });

  test('фильтры task: и links: агрегируют задачи и связи', () => {
    seed([], [
      { id: 'n1', title: 'Задача', body: '- [ ] сделать', tagIds: [] },
      { id: 'n2', title: 'Готово', body: '- [x] сделано', tagIds: [] },
      { id: 'n3', title: 'Ссылка', body: 'см. [[Задача]]', tagIds: [] },
      { id: 'n4', title: 'Одинокая', body: 'текст', tagIds: [] }
    ]);
    deepEqual(app.taskStats(app.noteById('n1')), { open: 1, done: 0, total: 1 });
    app.onSearch('task:open');
    deepEqual(app.searchScopeNotes().map(n => n.id), ['n1']);
    app.onSearch('task:done');
    deepEqual(app.searchScopeNotes().map(n => n.id), ['n2']);
    app.onSearch('links:out');
    deepEqual(app.searchScopeNotes().map(n => n.id), ['n3']);
    app.onSearch('links:in');
    deepEqual(app.searchScopeNotes().map(n => n.id), ['n1']);
    app.onSearch('links:orphan');
    deepEqual(app.searchScopeNotes().map(n => n.id).sort(), ['n2', 'n4']);
  });
});

describe('Релевантность (P2)', () => {
  test('сортировка по релевантности ставит точное совпадение в заголовке выше', () => {
    seed([], [
      { id: 'n1', title: 'Яблоко', body: 'коротко', tagIds: [], updated: 1 },
      { id: 'n2', title: 'Другое', body: 'яблоко '.repeat(5), tagIds: [], updated: 2 }
    ]);
    app.onSearch('яблоко');
    const sorted = app.sortNotes(app.state.notes, 'relevance');
    strictEqual(sorted[0].id, 'n1');
  });
});

describe('Автоподгрузка и объединение импорта (P1)', () => {
  test('список подгружается порциями, loadMoreNotes добавляет остаток', () => {
    const notes = [];
    for (let i = 0; i < 250; i++) notes.push({ id: 'n' + i, title: 'Заметка ' + i, body: '', tagIds: [], updated: i });
    seed([], notes);
    app.renderAll();
    strictEqual(app.notesTotalCount, 250);
    strictEqual(app.notesRenderLimit, 200);
    strictEqual(document.querySelectorAll('#notes .note-card').length, 200);
    strictEqual(app.loadMoreNotes(), true);
    strictEqual(document.querySelectorAll('#notes .note-card').length, 250);
    strictEqual(app.loadMoreNotes(), false);
  });

  test('mergeImportedData обновляет только более новые версии и добавляет новые', () => {
    seed([], [
      { id: 'n1', title: 'Старая', body: 'a', tagIds: [], updated: 10 },
      { id: 'n2', title: 'Не трогать', body: 'b', tagIds: [], updated: 100 }
    ]);
    const res = app.mergeImportedData({
      tags: [],
      notes: [
        { id: 'n1', title: 'Новая', body: 'a2', tagIds: [], updated: 20 },
        { id: 'n2', title: 'Устаревшая', body: 'b', tagIds: [], updated: 50 },
        { id: 'n3', title: 'Добавлена', body: '', tagIds: [], updated: 30 }
      ]
    });
    deepEqual(res, { added: 1, updated: 1, total: 3 });
    strictEqual(app.noteById('n1').title, 'Новая');
    strictEqual(app.noteById('n2').title, 'Не трогать');
    ok(app.noteById('n3'), 'новая заметка добавлена');
  });
});

describe('Массовые операции (P2)', () => {
  test('выделение и массовое закрепление/удаление', async () => {
    seed([], [
      { id: 'n1', title: 'A', body: '', tagIds: [], updated: 1 },
      { id: 'n2', title: 'B', body: '', tagIds: [], updated: 2 },
      { id: 'n3', title: 'C', body: '', tagIds: [], updated: 3 }
    ]);
    app.renderAll();
    app.toggleBulkSelection('n1');
    app.toggleBulkSelection('n2');
    deepEqual(app.bulkSelected.sort(), ['n1', 'n2']);
    app.bulkTogglePin();
    strictEqual(app.noteById('n1').pinned, true);
    strictEqual(app.noteById('n2').pinned, true);
    strictEqual(app.noteById('n3').pinned, undefined);
    strictEqual(app.bulkSelected.length, 0, 'после операции выделение снято');

    app.toggleBulkSelection('n1');
    app.toggleBulkSelection('n2');
    const p = app.bulkDelete();
    document.getElementById('dialogOkBtn').click();
    await p;
    ok(!app.noteById('n1') && !app.noteById('n2'), 'выбранные заметки удалены');
    ok(app.noteById('n3'), 'остальные на месте');
  });

  test('диапазон Shift-выделения идёт по порядку карточек', () => {
    seed([], [
      { id: 'n1', title: 'A', body: '', tagIds: [], updated: 3 },
      { id: 'n2', title: 'B', body: '', tagIds: [], updated: 2 },
      { id: 'n3', title: 'C', body: '', tagIds: [], updated: 1 }
    ]);
    app.renderAll();
    app.toggleBulkSelection('n1');
    app.bulkSelectRange('n3');
    deepEqual(app.bulkSelected.sort(), ['n1', 'n2', 'n3']);
  });
});

describe('Diff, поиск и черновики (P2)', () => {
  test('textDiffPreview показывает «− было / + станет», dataDiffSummary считает изменения', () => {
    const diff = app.textDiffPreview('строка 1\nстарое', 'строка 1\nновое');
    ok(diff.includes('- старое'));
    ok(diff.includes('+ новое'));
    ok(!diff.includes('- строка 1'), 'общий префикс не дублируется');

    seed([{ id: 't1', name: 'a' }], [
      { id: 'n1', title: 'A', body: 'old', tagIds: ['t1'], updated: 1 },
      { id: 'n2', title: 'B', body: '', tagIds: [], updated: 1 }
    ]);
    const summary = app.dataDiffSummary(app.state, {
      tags: [{ id: 't1', name: 'a' }, { id: 't2', name: 'b' }],
      notes: [
        { id: 'n1', title: 'A2', body: 'new', tagIds: ['t1'], updated: 2 },
        { id: 'n3', title: 'C', body: '', tagIds: [], updated: 2 }
      ]
    });
    ok(summary.includes('＋ новых заметок: 1'));
    ok(summary.includes('− удалится заметок: 1'));
    ok(summary.includes('✎ изменится заметок: 1'));
    ok(summary.includes('Новые тэги: b'));
  });

  test('created: фильтрует по дате создания, | даёт ИЛИ внутри токена', () => {
    const jan = new Date(2024, 0, 15, 12).getTime();
    const feb = new Date(2024, 1, 10, 12).getTime();
    seed([], [
      { id: 'n1', title: 'Кот', body: 'мур', tagIds: [], created: jan, updated: jan },
      { id: 'n2', title: 'Пёс', body: 'гав', tagIds: [], created: feb, updated: feb },
      { id: 'n3', title: 'Птица', body: 'кар', tagIds: [], created: feb, updated: feb }
    ]);
    app.onSearch('created:2024-01-15');
    deepEqual(app.searchScopeNotes().map(n => n.id), ['n1']);
    app.onSearch('created:>=2024-02-01');
    deepEqual(app.searchScopeNotes().map(n => n.id).sort(), ['n2', 'n3']);
    app.onSearch('кот|пёс');
    deepEqual(app.searchScopeNotes().map(n => n.id).sort(), ['n1', 'n2']);
  });

  test('черновики хранятся по заметкам и старый одиночный формат читается', () => {
    seed([], [
      { id: 'n1', title: 'Первая', body: 'a', tagIds: [], updated: 1 },
      { id: 'n2', title: 'Вторая', body: 'b', tagIds: [], updated: 1 }
    ]);
    app.openEditor('n1');
    document.getElementById('fTitle').value = 'Черновик первой';
    app.scheduleDraftSave();
    app.flushDraftSave();
    app.closeEditor({ silent: true });
    app.openEditor('n2');
    strictEqual(document.getElementById('fTitle').value, 'Вторая', 'чужой черновик не подставляется');
    app.closeEditor({ silent: true });
    app.openEditor('n1');
    strictEqual(document.getElementById('fTitle').value, 'Черновик первой');
    app.closeEditor({ silent: true });

    // Старый формат: один черновик без обёртки drafts.
    app.storageSet('noteTreeDraft', JSON.stringify({ noteId: 'n2', title: 'Старый', body: '', tags: [], rating: 0, ts: Date.now() }));
    strictEqual(app.readStoredDraft('n2').title, 'Старый');
  });
});

describe('Доступность дерева (P2)', () => {
  test('строки дерева имеют role/treeitem, aria-level и aria-expanded', () => {
    seed([{ id: 't1', name: 'a' }, { id: 't2', name: 'b' }], [
      { id: 'n1', title: 'X', body: '', tagIds: ['t1', 't2'], updated: 1 }
    ]);
    app.renderAll();
    const row = document.querySelector('#tree .node-row[data-path="a"]');
    ok(row, 'строка папки отрисована');
    strictEqual(row.getAttribute('role'), 'treeitem');
    strictEqual(row.getAttribute('aria-level'), '1');
    strictEqual(row.getAttribute('aria-expanded'), 'true');
    strictEqual(row.getAttribute('aria-selected'), 'false');
    row.click();
    strictEqual(row.getAttribute('aria-expanded'), 'false', 'сворачивание обновляет aria-expanded');
  });

  test('активная папка помечается aria-selected', () => {
    seed([{ id: 't1', name: 'a' }], [{ id: 'n1', title: 'X', body: '', tagIds: ['t1'], updated: 1 }]);
    app.renderAll();
    app.currentPath = ['a'];
    app.applyTreeState();
    strictEqual(document.querySelector('#tree .node-row[data-path="a"]').getAttribute('aria-selected'), 'true');
  });
});

describe('Оптимизации и надёжность (P3)', () => {
  test('notesForPath берёт готовый набор из дерева', () => {
    seed(
      [{ id: 't1', name: 'a' }, { id: 't2', name: 'b' }],
      [
        { id: 'n1', title: 'AB', tagIds: ['t1', 't2'] },
        { id: 'n2', title: 'A', tagIds: ['t1'] },
        { id: 'n3', title: 'B', tagIds: ['t2'] }
      ]
    );
    deepEqual(app.notesForPath(['a']).map(n => n.id).sort(), ['n1', 'n2']);
    deepEqual(app.notesForPath(['a', 'b']).map(n => n.id), ['n1']);
    deepEqual(app.notesForPath(['нет']), []);
    app.currentPath = ['b'];
    deepEqual(app.notesInPath().map(n => n.id).sort(), ['n1', 'n3']);
  });

  test('догрузка добавляет карточки, не пересобирая уже показанные', () => {
    const notes = [];
    for (let i = 0; i < 250; i++) notes.push({ id: 'n' + i, title: 'N' + i, tagIds: [], updated: i });
    seed([], notes);
    app.renderNotes();
    const first = document.querySelector('#notes .note-card');
    strictEqual(document.querySelectorAll('#notes .note-card').length, 200);
    strictEqual(app.appendMoreNotes(), true);
    strictEqual(document.querySelector('#notes .note-card'), first, 'первая карточка осталась тем же DOM-узлом');
    strictEqual(document.querySelectorAll('#notes .note-card').length, 250);
    strictEqual(app.appendMoreNotes(), false);
  });

  test('Ctrl+S сохраняет заметку из редактора', () => {
    seed([], [{ id: 'n1', title: 'Старая', body: 'текст', tagIds: [], updated: 1 }]);
    app.openEditor('n1');
    document.getElementById('fTitle').value = 'Новая';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
    strictEqual(app.noteById('n1').title, 'Новая');
    strictEqual(app.editorOpen, false, 'редактор закрылся после сохранения');
  });

  test('«?» открывает справку, фокус возвращается после закрытия диалога', () => {
    const trigger = document.getElementById('newNoteBtn');
    trigger.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    const mask = document.getElementById('dialogMask');
    ok(mask.classList.contains('show'), 'диалог справки открыт');
    ok(document.getElementById('dialogMsg').textContent.includes('Ctrl/Cmd+N'));
    app.dialogClose(false);
    strictEqual(mask.classList.contains('show'), false);
    strictEqual(document.activeElement, trigger, 'фокус вернулся на кнопку');
  });

  test('ошибки промисов попадают в журнал диагностики', () => {
    const ev = new window.Event('unhandledrejection');
    ev.reason = new Error('асинхронный сбой');
    window.dispatchEvent(ev);
    ok(app.runtimeErrors.length > 0);
    strictEqual(app.runtimeErrors[0].msg, 'асинхронный сбой');
  });

  test('черновики ограничены и по количеству, и по общему размеру', () => {
    ok(app.HEAVY_KEYS.includes(app.DRAFT_KEY), 'черновики — тяжёлый ключ (IndexedDB)');
    const notes = [];
    for (let i = 0; i < 5; i++) notes.push({ id: 'n' + i, title: 'a', tagIds: [] });
    seed([], notes);
    const drafts = {};
    for (let i = 0; i < 5; i++) {
      drafts['n' + i] = { title: 't', body: 'x'.repeat(200 * 1024), tags: [], rating: 0, ts: Date.now() + i };
    }
    app.writeDraftStore({ drafts: { ...drafts, n1: { ...drafts.n1, body: 'короткий' } } });
    const stored = JSON.parse(app.storageGet(app.DRAFT_KEY));
    let bytes = 0;
    Object.values(stored.drafts).forEach(d => { bytes += (d.title || '').length * 2 + (d.body || '').length * 2; });
    ok(bytes <= app.DRAFT_BYTES_LIMIT + 1024, 'общий размер черновиков в пределах лимита');
    ok(stored.drafts.n1, 'самый свежий черновик сохранён');
  });

  test('автоснимки прореживаются, ручной снимок создаётся всегда', () => {
    app.saveSnapshots([{ ts: Date.now(), sig: '1:n1', count: 1, data: { tags: [], notes: [] } }]);
    seed([], [{ id: 'n2', title: 'Новая', tagIds: [] }]);
    strictEqual(app.maybeSnapshot(), false, 'слишком рано для нового автоснимка');
    strictEqual(app.maybeSnapshot(true), true, 'ручной снимок игнорирует интервал');
  });

  test('импорт Markdown разбирает заголовки, тэги и оценку', () => {
    seed([{ id: 't1', name: 'работа' }], [
      { id: 'n1', title: 'План', body: 'Первая строка\nВторая', tagIds: ['t1'], rating: 4 }
    ]);
    const md = app.exportMdText(app.state.notes);
    const parsed = app.parseMarkdownImport(md);
    strictEqual(parsed.length, 1);
    strictEqual(parsed[0].title, 'План');
    ok(parsed[0].body.includes('Первая строка'));
    deepEqual(parsed[0].tags, ['работа']);
    strictEqual(parsed[0].rating, 4);
    // Заголовок внутри блока кода не делит заметку.
    const one = app.parseMarkdownImport('# A\n```\n# не заголовок\n```\nтело');
    strictEqual(one.length, 1);
    ok(one[0].body.includes('# не заголовок'));
  });

  test('сохранённые представления экспортируются вместе с данными', () => {
    app.saveViews([{ name: 'Работа', query: '#работа', sort: 'updated', scope: 'all' }]);
    const data = app.serializeData();
    deepEqual(data.views.map(v => v.name), ['Работа']);
  });

  test('«Выбрать все» выделяет весь текущий список', () => {
    seed([], [
      { id: 'n1', title: 'A', tagIds: [], updated: 3 },
      { id: 'n2', title: 'B', tagIds: [], updated: 2 },
      { id: 'n3', title: 'C', tagIds: [], updated: 1 }
    ]);
    app.renderNotes();
    app.bulkSelectAll();
    deepEqual(app.bulkSelected.sort(), ['n1', 'n2', 'n3']);
    app.clearBulkSelection();
    strictEqual(app.bulkSelected.length, 0);
  });
});
