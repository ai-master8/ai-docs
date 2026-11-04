# AGENTS.md

Единственный документ проекта: здесь и инструкции для агентов, и техническое описание приложения.

## Что это за репозиторий

«TagTree» — личное однофайловое веб-приложение для иерархических заметок. Иерархия задаётся не папками, а **тэгами**: для заметки с тэгами `[работа, проект]` в дереве появляются обе ветки — `работа → проект` и `проект → работа` (все перестановки). Заметка без тэгов попадает в корень «Все без тэга».

- **Нет сборки и нет зависимостей у самого приложения.** `tag-tree.html` — HTML + CSS + JS в одном файле (~4000 строк) и должен оставаться самодостаточным: никаких `<script src>`, `<link href>`, CDN, внешних шрифтов и картинок.
- Интерфейс, комментарии и документация — на русском.
- `tests/package.json` — единственный `package.json` в проекте; он нужен только для dev-зависимости `jsdom` (установлена в `tests/node_modules`).
- Запуск: двойной клик по `tag-tree.html` (`file://`) или через локальный сервер (`http://localhost`). Заметки, снимки и корзина лежат в IndexedDB, настройки — в `localStorage` (при `file://` корпоративный Chromium может его блокировать, тогда не сохранятся только настройки) — см. «Хранение».

Файлы:

| Путь | Что это |
|---|---|
| `tag-tree.html` | всё приложение — источник истины |
| `tests/run_test.js` | мини-раннер: грузит приложение в jsdom |
| `tests/note_tree.test.js` | сами тесты |
| `tests/package.json` | dev-зависимость `jsdom`, скрипт `npm test` |
| `tag-tree.json` | пример экспорта (схема v2), не исходник |

## Карта кода `tag-tree.html`

Порядок: `<head>` + `<style>` → разметка `<body>` → `<script>` → тест-хук `window.__app` в самом конце.

Секции скрипта помечены комментариями `// ---------- Имя ----------` — сохраняйте этот стиль.

| Секция | Ключевые функции |
|---|---|
| Persistence | `storageGet/storageSet`, `memStore`, `HEAVY_KEYS`, `storageInit`, `openIdb/idbGetAll/idbPut`, `queueIdbWrite/flushIdbWrites/idbIdle`, `migrateLsToIdb`, `storageClearMemory`, `parseStoredState`, `isQuotaError/relieveQuota/notifyQuota`, `deferSetting/flushDeferredSettings`, `withTimeout`, `requestPersistentStorage`, константы ключей, `loadState/saveState/saveTheme/saveCollapsed` |
| Таблица тэгов | `rebuildTagIndex`, `tagColorMap`, `ensureTag`, `tagName`, `getTagByName`, `sameName`, `pruneTagIds`, `normalizeNote`, `isEmptyNote`, `isValidData`, `applyData` |
| Версионные снимки | `loadSnapshots/saveSnapshots/maybeSnapshot/restoreSnapshot/snapshotMenu` |
| Корзина | `loadTrash/saveTrash/moveToTrash/restoreFromTrash/emptyTrash/trashMenu` |
| Отмена | `prepareUndo/undoLastAction` |
| Notifications | `notify` |
| Tags / permutations | `permute`, `tagsOf`, `tagsLowerOf`, `pathTagsOf`, `notePaths`, `allTags`, `noteBelongsToPath`, `invalidateTree`, `buildTree` |
| Tree model / Rendering | `renderTree/renderNode`, `buildChildren`, `updateRowState`, `applyTreeState`, `toggleFolder`, `treeHandleClick/ContextMenu/DragOver/DragLeave/Drop`, `renderBreadcrumbs`, `renderNotes`, `previewText`, `safeCssColor`, `renderAll`, `isPathActive`, `expandAllTree/collapseAllTree/initTreeCollapse`, `allCollapsedExcept`, `humanDate`, `notesKeyNav/treeKeyNav` |
| Просмотр заметки | `openNoteView/closeNoteView/renderNoteView`, `goToPath`, `goToPathRevealed/revealTreePath`, `findNoteCard/resetNoteListWidth` |
| Командная палитра | `paletteCommands`, `paletteScore`, `openPalette/closePalette/renderPalette/paletteKey` |
| Markdown | `escapeHtml`, `renderMarkdown`, `queryTerms`, `highlightElement` |
| Note selection / editor | `selectNote` (открывает просмотр), `openEditor/openEditorPanel/closeEditor`, `editorDirty/guardUnsavedEditor/updateEditorDirtyMark/remapEditorTags/requestCloseEditor`, `saveNote/deleteNote`, `renderRatingInput`, `addTagInput/addTag/removeTag/renderTagBadges/renderTagHints/tagInputKey`, `updateTagSuggest/applyTagSuggest` |
| Markdown-предпросмотр | `updateMdPreview`, `updateMdWordCount`, `syncMdScroll`, `setMdMode`, `scheduleMdPreview/cancelMdPreview` |
| Тулбар Markdown | `applyMdFormat` |
| Поиск и замена в редакторе | `openFindBar/closeFindBar/mdFindNext/mdReplaceOne/mdReplaceAll` |
| Оглавление | `updateMdToc` |
| Search | `onSearch`, `setSearchScope/renderSearchScope/clearSearchField`, `inSearchScope/matchesSearchScoped/searchScopeNotes`, `tokenizeQuery/parseLocalDate/parseQuery/getParsedQuery/tagToken`, `matchesSearch`, `notesInPath`, `fuzzyMatch`, `updateSearchSuggest/applySearchSuggest` |
| Фасеты | `renderFacets/cycleFacet/resetFacets/toggleFacets` |
| Сохранённые представления | `loadViews/saveViews/addView/deleteView/applyView/renderViews/promptSaveView` |
| Theme | `toggleTheme/applyTheme` |
| File System Access API | `chooseFile/saveToFile/readFromFile/restoreFileHandle/destroyFileHandle/checkFileConflict/byteLength` |
| Управление тэгами | `renameTag/deleteTag/setTagColor/mergeTags` |
| Менеджер тэгов | `openTagManager/closeTagManager/renderTagManager/tagManagerColor/tagManagerRename/tagManagerMerge/tagManagerDelete/removeOrphanTags/findSimilarTagNames/highlightSimilarTags` |
| Контекстное меню | `showCtxMenu/closeCtxMenu/submenuFor`, `folderContextMenu/noteContextMenu/colorMenuFor/moveMenuFor/historyMenuFor/trashMenu/snapshotMenu/sortMenu` |
| Export / Import | `serializeData/exportData/importData`, `exportMd/exportTxt/printNotes/downloadText`, `exportFound` |
| Mobile | `toggleSidebar/closeSidebar/toggleSidebarIfMobile` + свайп |
| Универсальный диалог | `dialogShow/dialogClose/dialogConfirm/dialogPrompt` |
| Shortcut | глобальный `keydown` |
| Init | `renderFatal`, `window.onerror`, `attachEvents` (делится на `attachLifecycleEvents`/`attachHeaderEvents`/`attachNotesEvents`/`attachTreeEvents`/`attachSearchEvents`/`attachEditorEvents`/`attachTagManagerEvents`/`attachPaletteEvents`/`attachMarkdownEvents`/`attachDialogEvents`), стартовый `try/catch` |

## Модель данных (не ломать)

Схема — **version 2**. `state = { notes, tags, theme }`.

Таблица тэгов:

```js
state.tags = [{ id: 't…', name: 'работа', color?: '#8b5cf6' }]
```

Заметки ссылаются на тэги **по id**, не по имени. `tagById` (`id → name`) пересобирается `rebuildTagIndex()` после любого изменения таблицы.

Заметка:

```js
{
  id: 'n…', title, body,
  tagIds: ['t…'],            // ссылки в таблицу тэгов
  created, updated,          // ms timestamp
  rating,                    // 0–5, 0 — без оценки (целое)
  pinned?: true,             // закреплённая — всегда сверху
  history?: [{ title, body, ts }]  // до 20 снимков
}
```

- `normalizeNote(n)` приводит к этой структуре, конвертирует старый `tags: ['имя']` в `tagIds` через `ensureTag()`, обрезает `history` до 20, генерирует `id` при отсутствии, нормализует `rating` через `clampRating()` (целое 0–5, отсутствие → 0).
- `isEmptyNote(n)` — пустая, если нет заголовка, текста и тэгов; такие заметки отбрасываются при загрузке/импорте.
- `isValidData(data)` — массив заметок либо объект с **массивом** `notes`. Объект с `notes`-не-массивом невалиден: иначе импорт затёр бы данные пустым набором.
- `applyData(data)` нормализует таблицу и заметки, **дедуплицирует тэги по id и по имени без учёта регистра** и перенаправляет `tagIds` на канонические id (цвет дубля переносится, если у канона его нет). Возвращает массив заметок — **`state.notes` он не присваивает**, это делает вызывающий.

## Хранение (IndexedDB + localStorage)

Два слоя. Тяжёлые данные — в IndexedDB, настройки — в `localStorage`. Снаружи всё синхронно: `storageGet`/`storageSet` читают и пишут `memStore` (кэш тяжёлых ключей), который один раз наполняется в `storageInit()` до `loadState()`. **Никогда не вызывайте `localStorage`/`indexedDB` напрямую** (исключения — `storageProbe()`, `storageInit()` и работа с дескриптором файла, где ошибки обрабатываются локально).

| Ключ | Где | Содержимое |
|---|---|---|
| `noteTreeData_v1` | **IDB** | `{ version: 2, tags, notes }` (имя историческое, внутри схема v2) |
| `noteTreeData_v1_backup` | **IDB** | снимок состояния при загрузке страницы (защита от затирания) |
| `noteTreeSnapshots` | **IDB** | до 5 версионных снимков |
| `noteTreeTrash` | **IDB** | до 20 удалённых заметок |
| `noteTreeTheme` | LS | `'light'` / `'dark'` |
| `noteTreeCollapsed` | LS | JSON-массив ключей свёрнутых папок (`'работа/проект'`) |
| `noteTreeCollapsedDefaulted` | LS | `'1'` — стартовое сворачивание дерева уже применено |
| `noteTreeSort` | LS | `'updated'` / `'created'` / `'title'` |
| `noteTreeLastView` | LS | `{ path: [...], q: '…', scope: 'all'\|'folder' }` — последнее место |
| `noteTreeViews` | LS | сохранённые представления (фильтры) |
| `noteTreeFileName` | LS | имя привязанного файла (для диагностики) |
| IndexedDB `noteTreeFileHandle` | IDB | дескриптор файла (File System Access API) |

- **`HEAVY_KEYS`** (`noteTreeData_v1`, `..._backup`, `noteTreeSnapshots`, `noteTreeTrash`) — единственный список того, что живёт в базе `noteTreeDB` / store `kv`. Добавляя новый тяжёлый ключ, добавьте его сюда.
- `storageInit()`: открывает базу, одним чтением поднимает `HEAVY_KEYS` в `memStore`, затем `migrateLsToIdb()` переносит старые значения из `localStorage` и удаляет LS-копию **только после подтверждённой записи**. Если IndexedDB недоступна — `idbMode = false`, всё работает по-старому через `localStorage`. Открытие ограничено `IDB_INIT_TIMEOUT` (3 с, `withTimeout`): зависший `open()` не оставляет приложение с пустым экраном, а позднее соединение закрывается (`idbAbandoned`).
- `storageSet()` для тяжёлого ключа в режиме базы пишет в `memStore` сразу и ставит ключ в очередь `queueIdbWrite()`. По ключу одновременно идёт не больше одной транзакции, промежуточные значения схлопываются. При сбое ключ **возвращается в очередь** (`idbDirty`) и повторяется до `IDB_RETRY_MAX` (3) раз с растущей паузой; только после этого — один тост за сессию (`notifyStorageFailure`). `flushIdbWrites()` вызывается на `pagehide`/`visibilitychange` и пытается дописать всё немедленно.
- Переполнение (`QuotaExceededError`, `relieveQuota()`): сначала удаляется половина старых снимков, затем половина корзины, запись повторяется; пользователю один раз показывается совет про экспорт. Работает и для `localStorage`-режима, и для IndexedDB.
- `loadState()`: `parseStoredState()` → при повреждённом JSON данные поднимаются из `noteTreeData_v1_backup`, затем из последнего снимка (`lastRecovery` = `backup`/`snapshot`, виден в диагностике и в тосте) → `applyData` → backup-ключ (`>0` заметок) → `maybeSnapshot()` → тема → режим сортировки → свёрнутые папки → `applyTheme()`. Если недоступно всё (`!storageAvailable && !idbMode`) — предупреждение через `notify`; если работает только база — предупреждение лишь про настройки.
- `saveState()` пишет `{ version: 2, tags, notes }` и вызывает `maybeSnapshot()`.
- Снимки (`maybeSnapshot`) создаются при **изменении состава заметок** (сигнатура `count:ids`), а не при каждом редактировании текста. Список снимков держится в памяти (`snapshotCache`), поэтому `saveState()` не парсит до пяти полных копий архива на каждое сохранение. Восстановление — «🕘» (`snapshotMenu`).
- Корзина тоже кэшируется в памяти (`trashCache`); `saveTrash()` пишет через кэш и обрезает до `TRASH_MAX`.
- Настройки (`saveLastView`, `saveCollapsed`) пишутся с задержкой `SETTINGS_DEBOUNCE` (250 мс): при быстрых переходах/сворачиваниях остаётся одна запись. Очередь сбрасывается на `pagehide`/`visibilitychange` (`flushDeferredSettings`), отменяется в `storageClearMemory`. `resetNavigation()` пишет свёрнутость сразу (`saveCollapsed(true)`).
- Диагностика: `storageProbe()` возвращает `idbMode`/`idbError`, `unsaved` (ключи, не дошедшие до базы) и `recovered`; `showDiagnostics()` добавляет `navigator.storage.estimate()`, `navigator.storage.persisted()` (работает и на `file://`) и строку о несохранённых ключах. `requestPersistentStorage()` при старте просит браузер не вытеснять данные.
- **`file://`-особенность (проверено в Chromium):** хранилище привязано к **папке** с HTML, а не к файлу. Тот же профиль, файл в другой папке → данных нет; другое имя в той же папке → данные есть. OPFS на `file://` заблокирован (`SecurityError`), IndexedDB работает и переживает перезапуск. Перенос между машинами — только через экспорт JSON или привязанный файл.

## Тэги и дерево (ядро логики)

```js
permute(arr)            // все перестановки (backtracking)
tagsOf(note)            // имена тэгов по tagIds (дедуп, без пустых)
pathTagsOf(note)        // tagsOf(...).slice(0, MAX_PERM_TAGS)
notePaths(note)         // перестановки для дерева; без тэгов — [[]]
noteBelongsToPath(n, p) // принадлежность папке за O(n)
buildTree()             // { name, ids: Set, children: Map }
```

- `MAX_PERM_TAGS = 5` — только первые 5 тэгов участвуют в дереве (перестановки растут как k!).
- Дерево строится по **именам** тэгов (`tagsOf`), но хранится модель по id — поэтому переименование/удаление тэга в таблице автоматически обновляет дерево.
- `noteBelongsToPath` не генерирует перестановки: заметка принадлежит папке, если **все** тэги пути есть в её наборе (порядок не важен). Пустой путь — только заметки без тэгов.
- Счётчик папки — `node.ids.size` (уникальные заметки), а не число проходов перестановок.
- `buildTree()` кэшируется (`treeCache`). После мутаций заметок/тэгов **обязательно** `invalidateTree()`, иначе рендер покажет старые данные.
- `currentPath` и ключи `collapsed` — массивы/строки **имён** тэгов. При `renameTag`/`deleteTag`/`mergeTags` они пересчитываются, сравнение — регистронезависимое (`sameName`).
- `renameTag` проверяет дубль имени; `deleteTag` вычищает `tagIds` через `pruneTagIds`; `mergeTags` переносит ссылки без дублей и сохраняет цвет целевого.

## Рендеринг

```js
renderAll(opts) → renderSearchScope() + renderTree() + renderBreadcrumbs() + renderFacets() + renderNotes() + renderNoteView() + saveLastView()
// opts: { tree, crumbs, facets, notes, noteView, view } — любой можно выключить (false)
```

- **Дерево инкрементальное.** `treeRows` — реестр «ключ пути → узел» (`row`, `chev`, `icon`, `childrenDiv`, `node`). `renderTree()` пересобирает DOM только когда `treeDirty` (его поднимает `invalidateTree()`), иначе вызывает `applyTreeState()`: обновляет `.active`, шевроны, цвета и видимость детей на месте. Поэтому переход по папкам, поиск и `renderAll({ tree: false })` не пересоздают сотни строк.
- **Сворачивание** (`toggleFolder`) прячет готовый `childrenDiv` (убирает из DOM, чтобы `treeKeyNav` не видел скрытых строк) и кэширует его в записи узла — повторное разворачивание не строит DOM заново. `expandAllTree`/`collapseAllTree` ставят `treeDirty = true` и пересобирают дерево.
- **Первый запуск**: при отсутствии отметки `noteTreeCollapsedDefaulted` `initTreeCollapse()` один раз сворачивает все ветки с детьми (`allCollapsedExcept`) и оставляет видимой только ветку последнего места (`currentPath`). Поэтому при открытии приложение не разворачивает всё дерево; дальнейшие запуски уважают сохранённую пользователем свёрнутость.
- **Обработчики делегированы**: на `#tree` висят `treeHandleClick/ContextMenu/DragOver/DragLeave/Drop`, на `#notes` — click/contextmenu/dragstart. На самих строках и карточках обработчиков нет (важно для больших списков).
- **Карточки** (`renderNotes`) собираются одной HTML-строкой и вставляются одним `innerHTML`. Пользовательский текст — только через `escapeHtml`, превью — через `renderMarkdown`; цвета тэгов проходят `safeCssColor` (hex/rgb/hsl/имя цвета), чтобы импортированные данные не попали в `style`. Рейтинг выводится звёздами в строке `.dt` (только если оценка > 0). Подсветка — после вставки, по `.preview`.
- **Просмотр заметки** (`.content-split` + `#noteView`): клик по карточке (`selectNote` → `openNoteView`) показывает заметку целиком справа — заголовок, тэги, рейтинг, даты и полный Markdown (`renderMarkdown`). Список при этом сужается до одной колонки (`.has-view`), но карточка не меняет размер: `openNoteView` запоминает её ширину до открытия, выставляет ширину списка через `notes.style.flex` и при необходимости корректирует её; `resetNoteListWidth()` снимает фиксацию при закрытии. Прокрутка не сбрасывается: `openNoteView` только переключает `.selected` на существующих карточках и при необходимости `scrollIntoView`. Шапка `.nv-head` («✕ Закрыть» и «✎ Редактировать») закреплена, а прокручивается только текст в `.nv-scroll`, поэтому кнопки всегда видны. Закрытие — «✕ Закрыть» / Esc / «← К списку» на узких экранах (≤900px список скрывается). **Редактор открывается в этой же правой панели** (`#editorView`, класс `.has-editor`): просмотр при этом скрыт, дерево и список остаются, а `.has-view` продолжает удерживать ширину списка. `renderNoteView` при отсутствии заметки закрывает панель только если редактор не открыт (иначе панель нужна для новой заметки), а `goToPath` и `onSearch` сбрасывают `viewingId`, чтобы не показывать заметку вне контекста.
- **Обработчики просмотра делегированы** на `#noteView` (`.nv-close`, `.nv-edit`, `.nv-tags .tag`); `#notes` дополнительно слушает `dblclick`.
- **Крошки** (`renderBreadcrumbs`): «🏠 Все без тэга» → сегменты `currentPath` (кнопки с клавиатурным фокусом; текущий сегмент помечен `aria-current`); счётчик справа — «N найдено» (в режиме «В папке» — «N найдено в папке») при поиске, иначе «N заметок».
- **Список**: при непустом `searchQuery` — поиск по области `searchScope` (`searchScopeNotes()`), иначе — `notesInPath()`. Затем `sortNotes()` и закреплённые (`pinned`) наверх. Карточка `.note-card`: заголовок, превью (`previewText` → Markdown, обрезка 140 символов + `…`; строки таблиц выкидываются — в 96px они нечитаемы), кликабельные тэги, человекочитаемая дата; drag-and-drop в папку (`text/note-id`); `tabIndex` и клавиатурная навигация. В результатах поиска дополнительно показывается путь заметки (`pathTagsOf` → «a / b», для корня — «Без тэга») и кнопка «в дереве» (`.np-show` → `goToPathRevealed`), которая очищает поиск, раскрывает нужную ветку и переходит в неё.
- Пустые состояния: единый блок `.empty` с иконкой, заголовком и подсказкой. Для поиска — «Ничего не найдено» / «В этой папке ничего не найдено» и кнопка сброса поиска; для пустой папки — создание заметки; для пустого архива — «📂 Открыть файл данных»; для корня с заметками только в ветках — подсказка про дерево.
- `humanDate`: «только что», «N мин назад», «сегодня, ЧЧ:ММ», «вчера, ЧЧ:ММ», затем дата (`12 окт` / с годом).
- `saveLastView()` пишет в `localStorage` только при изменении пути/запроса/области и с задержкой 250 мс (`deferSetting`); очередь сбрасывается на `pagehide`/`visibilitychange`, поэтому при закрытии вкладки место всё равно сохраняется.

## Поиск

`onSearch(v)` пишет `searchQuery`, закрывает открытый просмотр (`viewingId = null`) и перерисовывает `renderNotes()` + `renderBreadcrumbs()` + `renderFacets()` + `renderSearchScope()`, сохраняя место. Поле `#search` вызывает его с debounce 120 мс; прямые вызовы (`onSearch('')`, фасеты, представления, автодополнение) — синхронные.

- **Область поиска** (`searchScope`, кнопки «Везде» / «В папке» под полем): `setSearchScope('all'|'folder')` переключает и сразу пересчитывает список, крошки и фасеты. В корне (`currentPath` пуст) режим «В папке» недоступен (`renderSearchScope` отключает кнопку и сбрасывает область на `all`). `inSearchScope(n)` ограничивает набор `currentPath`, `matchesSearchScoped(n)` = область + `matchesSearch(n)`, `searchScopeNotes()` — готовый список. Этой областью пользуются список, крошки, фасеты и «Экспорт найденного». Сохранённые представления применяются с областью «Везде».
- **Клавиши**: `/` (не в поле ввода) фокусирует `#search` и выделяет текст; `Esc` в поле сначала закрывает автодополнение, затем очищает запрос (`clearSearchField`). Кнопка «✕» внутри поля (`#searchClear`, `updateSearchClear`) видна при непустом запросе и очищает его мгновенно, отменяя отложенный ввод.

Синтаксис (`tokenizeQuery` → `parseQuery`, результат кэшируется `getParsedQuery()`):

| Токен | Смысл |
|---|---|
| `#тэг` | обязательный тэг (точное имя) |
| `#"тэг с пробелом"` | имя с пробелами — в кавычках |
| `-тэг` / `!тэг` | исключить тэг |
| `title:слово` | подстрока в заголовке (все такие токены обязательны) |
| `since:YYYY-MM-DD` / `until:YYYY-MM-DD` | диапазон по `updated` (локальная дата; `until` включает весь день) |
| прочий текст | подстрока в заголовке/теле/тэгах, логика «И» |

- `matchesSearch`: include-тэги — все и точные, exclude — точные, свободные токены — каждый должен найтись («И»), `title:` — все в заголовке, даты — по `updated || created`. Имена тэгов заметки берутся из кэша `tagsLowerOf(n)` (сбрасывается в `invalidateTree()`).
- `tagToken(name, prefix)` сериализует тэг обратно в токен (кавычки при пробелах); используется фасетами и представлениями.
- **Подсветка**: `queryTerms()` кэширует термы по строке запроса и переиспользует `getParsedQuery()`, поэтому `highlightElement` не парсит запрос для каждой карточки.
- **Автодополнение `#`**: `#searchSuggest`, кандидаты — `allTags()` через `fuzzyMatch` (подстрока или subsequence: `рбт` → `работа`), ↑/↓/Enter/Esc.
- **Фасеты** (`#facets`): динамические — строятся по заметкам, уже прошедшим include-фильтры; счётчик — сколько заметок с тэгом в текущем сочетании. Активные берутся из запроса, а не из таблицы, и видны всегда (`.on` / `.excl`). Shift/Alt/правый клик — исключить. `cycleFacet` пере-экранирует оставшиеся тэги и не трогает свободный текст, даже если он совпал с именем тэга. `resetFacets` полностью очищает поиск.
- **Представления**: `addView(name, query)` → `noteTreeViews`, `applyView`, `deleteView`, кнопка «💾 Сохранить фильтр» (`promptSaveView`).

## Менеджер тэгов и командная палитра

- **Менеджер тэгов** («🏷️»): `openTagManager/renderTagManager`. Список всех тэгов с цветной точкой, именем, числом заметок и действиями: цвет (`TAG_COLORS`, `setTagColor`), переименовать (`renameTag`), слить (`mergeTags`), удалить (`deleteTag`). Есть поиск по подстроке (`#tmSearch`), сводка («N тэгов» или «M из N тэгов»), уборка пустых тэгов (`removeOrphanTags`) и подсветка похожих имён (`findSimilarTagNames` — Левенштейн, `highlightSimilarTags`).
- **Командная палитра** (`Ctrl+K`, алиас `Ctrl+P`): единый быстрый переход. `openPalette` открывает `#paletteMask`; `renderPalette` собирает группы «Команды» (`paletteCommands()`), «Папки и тэги» (`allTags()`), «Заметки» и «Сохранённые фильтры» (`loadViews()`). Нечёткий отбор и сортировка — `paletteScore` (точное совпадение → начало → подстрока → subsequence, иначе отбрасывается); заметки ищутся по заголовку и строке тэгов. Префиксы: `>` — только команды, `#` — только тэги, `@` — только заметки. Заметки ограничены 10 последними (по `updated`), тэги — 12, фильтры — 6. Переход к тэгу очищает поиск, подтверждает уход из редактора и раскрывает ветку (`goToTag` → `goToPathRevealed`). Навигация ↑/↓ идёт через общий `moveActiveItem()` (как в автодополнении тэгов и подсказках поиска), Enter, Esc; пункты запускаются по `mousedown`, чтобы не терять фокус.

## Редактор заметок

Открывается двойным кликом по карточке, кнопкой «✎ Редактировать» в просмотре, пунктом контекстного меню или `Ctrl+N` для новой. Обычный клик по карточке редактор не открывает — он показывает заметку целиком (`openNoteView`).

**Это не модальное окно.** Редактор — статическая секция `#editorView` внутри `.content-split`, справа от списка. Дерево и список остаются видимыми и доступными; на ≤900px список скрывается, как и при просмотре, и редактор занимает весь контент. Модальные окна остались только для палитры, менеджера тэгов и универсального диалога (`#dialogMask`).

`openEditor(id)` → `openEditorPanel(id)`:

- `editorOpen` и `editingId` описывают состояние; для существующей заметки выставляется `viewingId` и вызывается `openNoteView(id)`, чтобы подсветить карточку и зафиксировать ширину списка;
- для новой заметки `viewingId`/`selectedId` очищаются, панель всё равно раскрывается (`.has-view` + `.has-editor`), а тэги **не наследуются** от `currentPath`: новая заметка всегда создаётся без тэгов;
- заполняет `#fTitle`/`#fBody`, ставит `editorRating` из заметки (или 0 для новой) и вызывает `renderRatingInput()`; `#btnDelete` виден только для существующей;
- очищает `#fTags`, закрывает findbar, сбрасывает режим на «Редактор», прокручивает панель наверх;
- запоминает `editorSnapshot` для отслеживания несохранённых изменений; шапка показывает `#editorDirtyMark` («● не сохранено»).

Поведение:

- `editorDirty()` сравнивает заголовок, тело, черновик `#fTags`, `editorRating` и `currentTags`; `updateEditorDirtyMark()` обновляет индикатор на ввод.
- `requestCloseEditor()` (Esc, ✕, «Отмена») при изменениях спрашивает подтверждение. `closeEditor({ silent: true })` закрывает без вопросов и используется после сохранения/удаления/навигации; обычное закрытие возвращает к просмотру заметки, а для новой — к списку.
- **Защита от потери правок**: `guardUnsavedEditor(message, action)` спрашивает и выполняет действие только после подтверждения. Через него проходят `openEditor`, `openNoteView`, `goToPath`, переходы к тэгу/папке из палитры и карточек. `onSearch()` проверяет правки сам и при отмене возвращает в поле прежний запрос.
- `remapEditorTags(mapper)` вызывается из `renameTag`/`deleteTag`/`mergeTags`: имена тэгов в открытом редакторе обновляются вместе с таблицей, иначе сохранение воскресило бы старый тэг.
- Esc при открытых палитре/диалоге/менеджере тэгов закрывает их, а не редактор.
- `saveNote()`: если в `#fTags` остался необработанный текст — сначала `addTagInput()`; пустая заметка не сохраняется; имена тэгов → id через `ensureTag()`; `rating` берётся из `editorRating`; `pushHistory` только если реально изменились заголовок/тело. После сохранения `viewingId` указывает на сохранённую (в т.ч. новую) заметку, редактор закрывается, `renderAll()` показывает её в режиме чтения.
- `deleteNote(id)`: подтверждение → `prepareUndo` → в корзину → удаление → сохранение/рендер. Без `id` удаляется заметка из редактора; контекстное меню и клавиатура передают id явно, чтобы не сбить состояние редактора.
- `moveNoteToTag(noteId, tag)`: перемещение = **единственный** тэг папки (`tagIds = [id]`, `null` — корень); текущая папка не сбрасывается.
- Ввод тэгов: `,` и `/` режут на несколько; дедупликация без учёта регистра; бейджи с ✕; подсказки до 8; автодополнение до 10 (`updateTagSuggest`, ↑/↓/Enter/Esc).

### Рейтинг заметки

- `rating` — целое 0–5 (0 — без оценки). Нормализуется `clampRating()`, звёзды собирает `starsHtml()` (закрашенные `★`, пустые `☆`, `aria-label` с оценкой).
- В редакторе — `#fRating` с пятью кнопками `.star-btn`; состояние хранит `editorRating`. Клик по звезде ставит оценку, повторный клик по той же — сбрасывает в 0. `renderRatingInput()` обновляет символы, `.on` и `aria-pressed`.
- Рейтинг виден на карточке (в строке `.dt`, только при оценке > 0) и в шапке просмотра (`.nv-rating`). Дублирование (`duplicateNote`) копирует рейтинг; в историю версий он не попадает (история — только заголовок и тело).

### Markdown-редактор

- Режимы `setMdMode('edit'|'split'|'preview')`: только ввод / ввод + живой предпросмотр с синхронным скроллом / только предпросмотр. `openEditor` всегда открывает `edit`.
- Тулбар `.md-tb[data-cmd]`: H1–H3, bold, italic, strike, code, ul, ol, list-todo, quote, link, hr, table, clear. `applyMdFormat(cmd)` вставляет/оборачивает разметку вокруг выделения.
- `renderMarkdown(src)` — безопасный поднабор: заголовки, списки (`md-ul`, `md-ul.todo`, `<ol>`), цитаты, `---`, инлайн- и блочный код, жирный/курсив/зачёркнутый, ссылки, таблицы (внутри блока кода не парсятся; оборачиваются в `.md-table-wrap`, чтобы широкая таблица прокручивалась, а не растягивала страницу). **Весь HTML экранируется**; ссылки допускаются только `http:`, `https:`, `mailto:`. Пустые строки сохраняются как `<div class="md-gap"><br></div>` — ровно одна пустая строка на каждую (ведущие и хвостовые отбрасываются), поэтому абзацы не слипаются.
- Примечание: класс `.md-ul` стилизован глобально (не только в `#mdPreview`), чтобы превью в карточках выглядело так же.
- `Ctrl+H` — поиск/замена (`#mdFindbar`), без учёта регистра, замена одного/всех.
- Живой предпросмотр при вводе обновляется с задержкой 100 мс (`scheduleMdPreview`/`cancelMdPreview`); счётчик слов — сразу. `setMdMode`, сохранение и закрытие редактора отменяют отложенный рендер.
- `updateMdToc()` — кнопки H1–H3 над предпросмотром при ≥2 заголовках; пересобираются только при изменении набора заголовков (сигнатура `уровень:строка:текст`), позиция при клике считается по актуальному тексту.
- Счётчик `#mdWordCount` — «N слов · M симв».

## История, отмена, корзина, снимки

- **История заметки**: `history` до 20 снимков; `pushHistory(n)` перед перезаписью изменённого текста; меню заметки → «🕘 История версий» (10 последних) → `restoreHistory` (текущее состояние тоже сохраняется в историю).
- **Отмена (Ctrl+Z)**: `prepareUndo(label)` перед удалением заметки/тэга, слиянием, очисткой; `undoLastAction()` — одноуровневая, не работает в полях ввода и при открытом редакторе.
- **Корзина**: `noteTreeTrash`, до 20 записей; `moveToTrash/restoreFromTrash/emptyTrash`, меню «🕘 Версии данных → 🗑 Корзина».
- **Снимки**: до 5, ротация; восстанавливаются через `snapshotMenu` (с подтверждением), заменяют данные и сбрасывают навигацию.
- Меню «🕘 Версии данных» (`#backupBtn` → `snapshotMenu`): список снимков с датой и числом заметок, «🗑 Корзина (N)» и «♻️ Резервная копия (файл/браузер)». Кнопка переключает меню и вызывает `stopPropagation()`, иначе документный обработчик «клик вне меню» закроет его сразу после открытия.

## Экспорт, импорт, файловое хранение

- `serializeData()` → `{ app: 'note-tree', version: 2, exported, tags, notes, backup }`; `backup` — глубокий снимок прошлого успешного сохранения в файл (`lastSavedState`), используется «♻️ Восстановить» (`restoreFromBackup`).
- `exportData()` скачивает `tag-tree.json`; `exportMd`/`exportTxt` — `заметки.md`/`заметки.txt`; `exportFound()` — только текущий фильтр/папку; `notesInFolder(path)` — заметки конкретной ветки (для экспорта/печати папки из контекстного меню, без учёта глобального поиска); `printNotes` — печать/PDF через `#printArea` и `window.print()` (без библиотек).
- Импорт (`#fileInput`): JSON → `isValidData` → подтверждение с числом записей → `state.notes = applyData(data)` → `resetNavigation()` → `saveState()` → `saveToFile()` → `renderAll()`.
- `chooseFile()`: `showSaveFilePicker` → дескриптор в `fileHandle`, сохранение в IndexedDB, автосохранение; без API — обычный экспорт.
- `saveToFile()` пишет JSON в привязанный файл; запоминает `lastFileWriteTs` и `lastWrittenSize` (в **байтах**, `byteLength`). Записи идут строго по очереди (`fileWriteChain`), а `payload` и снимок состояния (`cloneStateSnapshot`) готовятся **синхронно до первого `await`** — иначе два быстрых сохранения могли бы перемешать состояния, а `backup` в файле относился бы к уже изменённым данным. При `NotAllowedError`/`NotFoundError`/потере разрешения сбрасывает привязку и предлагает выбрать файл заново (только если привязка всё ещё указывает на тот же дескриптор).
- `checkFileConflict()` на `visibilitychange`: если файл изменён извне (`lastModified` новее записи и размер другой) — предлагает перечитать.
- Привязка файла восстанавливается через IndexedDB (`restoreFileHandle`), но не гарантируется после перезагрузки; без IndexedDB — привязка только на сессию.
- Диагностика без консоли: «ℹ️» → `storageProbe()`/`showDiagnostics()` (режим открытия, доступность localStorage, режим IndexedDB и квота браузера, постоянное хранилище, число заметок, backup, несохранённые ключи, факт восстановления из резерва, привязанный файл).

## Тема, уведомления, мобильное, клавиши

- Тема: `data-theme` на `<html>`, значения `light`/`dark`; `toggleTheme()` + `applyTheme()` (иконка 🌙/☀️).
- Оформление: единый фокус `:focus-visible` (мышью рамка не появляется), тонкие полосы прокрутки в обеих темах, анимации модалок и подсветка наведения; при `prefers-reduced-motion` анимации отключены.
- Уведомления: `notify(message)`, 2600 мс, `#toast`. **Не переименовывать в `toast`** — для `<div id="toast">` браузер создаёт глобальную `window.toast`, которая затеняет функцию.
- Мобильное (≤720px): бургер, выезжающий сайдбар `.open`, закрытие по клику вне, по выбору папки/заметки и свайпом влево (>60px); модалки прижаты к низу; сетка карточек в 1 колонку. Редактор занимает весь контент, его шапка и футер закреплены, а прокручивается только `.ne-scroll`.
  - Шапка переносится (`flex-wrap`), на ≤420px у «Файл/Экспорт/Импорт» скрываются подписи (`.btn-label`) — на 320px получается 2 ряда вместо 3. Кнопки шапки ≥36px.
  - Поля ввода на мобильных — 16px, иначе iOS Safari зумит страницу при фокусе; тач-цели строк дерева, меню, палитры и футеров — 38–40px.
  - Тулбар Markdown на мобильных не переносится, а прокручивается по горизонтали (`.md-toolbar`), экономя высоту редактора.
  - Учтены `env(safe-area-inset-*)`, `max-height` модалок в `dvh`, `interactive-widget=resizes-content` во viewport: клавиатура не прячет футер редактора.
  - «Удалить / Отмена / Сохранить» на ≤400px ужимаются по горизонтали, чтобы не вылезать за пределы панели редактора.
- Горячие клавиши: `Ctrl/Cmd+N` — новая заметка (не в полях ввода; открытие поверх несохранённых правок спрашивает подтверждение), `Ctrl/Cmd+K` — быстрый переход (палитра; `Ctrl/Cmd+P` — алиас), `/` — фокус в поиск, `Ctrl/Cmd+Z` — отмена опасного действия, `Ctrl/Cmd+H` — поиск/замена в редакторе, `Esc` — закрыть редактор/просмотр заметки/палитру/подсказки или очистить поиск, `↑/↓/Enter/→/←` — навигация по дереву, карточкам, палитре и автодополнению.
- Контекстное меню (`#ctxMenu`): на папке — создать заметку, переименовать/удалить тэг, цвет, экспорт папки (MD/TXT), печать, открыть; на заметке — редактировать, дублировать, переместить, закрепить, история, экспорт, печать, удалить. Позиционируется с учётом границ экрана; подменю использует последнюю позицию (`lastCtxPos`), а не угол (0,0). Пункты меню запускаются через `runItem()` с перехватом async-ошибок.
- Диалоги вместо `prompt`/`confirm`: `dialogShow/dialogConfirm/dialogPrompt` (Promise), `#dialogMask`. Браузерные `prompt`/`confirm`/`alert` в проекте не используются.

## Безопасность (обязательно)

- **Анти-XSS:** любой пользовательский текст (заголовки, тело, тэги, имена папок, даже сообщения `renderFatal`) вставляется через `textContent`. `innerHTML` допустим только для собственных шаблонов без пользовательских данных (или после `escapeHtml`/`renderMarkdown`).
- `renderMarkdown` полностью экранирует HTML и разрешает только безопасные схемы ссылок.
- Подсветка поиска (`highlightElement`) работает по текстовым узлам и пропускает `MARK`/`CODE`/`PRE`, чтобы не ломать атрибуты и разметку.
- `renderFatal` + `window.onerror` + `try/catch` вокруг инициализации: при ошибке пользователь видит сообщение, а не пустую страницу.

## Тестирование

Запуск из корня репозитория:

```
node tests/run_test.js tests/note_tree.test.js
```

или `cd tests && npm test`. Сейчас: **101 тест, все проходят**.

- `tests/run_test.js` загружает `tag-tree.html` в jsdom (инлайновый `<script>` выполняется целиком) и выставляет глобальные `describe/test/it/beforeEach/afterEach`, `assert` (Node `assert`, **не** strict), `app` (= `window.__app`), `resetApp()`, `window`, `document`.
- `beforeEach`/`afterEach` на верхнем уровне — глобальные (для всех тестов), внутри `describe` — локальные. В тестах зарегистрирован `beforeEach(resetApp)`.
- `resetApp()` чистит `localStorage`, `memStore` (`storageClearMemory`), убирает `indexedDB`, обнуляет данные и вызывает `resetNavigation()` — сбрасывает путь, поиск, `viewingId`/`selectedId` и состояние редактора, поэтому тесты не влияют друг на друга.
- **Подводный камень:** `applyData(data)` только **возвращает** заметки и не присваивает `state.notes`. Нужно `state.notes = applyData(...)`.
- **Подводный камень:** массивы/объекты из jsdom-реалма имеют другой прототип, поэтому `assert.deepStrictEqual` на них падает. Для массивов/объектов — `assert.deepEqual`; `strictEqual` — для примитивов.
- jsdom установлен один раз в `tests/node_modules`; не переустанавливать и не удалять.
- Тесты опираются на `window.__app` — при переименовании/переносе функций синхронизируйте список экспорта.

Что покрыто: дерево по перестановкам и счётчики, корневые заметки, `noteBelongsToPath`, `MAX_PERM_TAGS`; миграция старого формата, дедупликация тэгов и перенаправление ссылок, отбрасывание пустых, `isValidData`; разбор запроса (`#тэг`, `-тэг`, `title:`, `since/until` с пробелом), `matchesSearch`; Markdown (списки/чекбоксы, таблицы внутри кода, обёртка таблиц для прокрутки, пустые строки-разделители абзацев, XSS, схемы ссылок); превью карточек без таблиц; подсветка поиска; `restoreLastView` (многосегментный путь); `moveNoteToTag`, `cycleFacet`, `renameTag`; корзина/undo, меню «Версии данных» (открытие и переключение); `byteLength`; доступность фасетов; интеграция редактора (`openEditor`, `saveNote`, рендер с подсветкой); **редактор в правой панели** — список остаётся, индикатор несохранённых правок, возврат к просмотру после отмены/сохранения, подтверждение при уходе в папку и поиск, Esc, переименование тэга не воскрешает старое имя; делегирование событий карточек и дерева, инкрементальное дерево (тот же DOM при клике, кэш детей), стартовое сворачивание дерева и сохранённая свёрнутость, `renderAll({ tree:false })`, инвалидация кэшей (`tagsLowerOf`, термы подсветки), `saveLastView` без лишних записей (с явным `flushDeferredSettings`), отложенный предпросмотр; слой хранения — `storageInit` без IndexedDB, миграция localStorage→IndexedDB, отсутствие тяжёлых ключей в localStorage, `loadState` из базы, снимки/корзина в базе, `storageProbe` с `idbMode`, устойчивость к сбою записи при миграции; **надёжность записи** — восстановление из backup и из снимка при повреждённом JSON, отсутствие ложного «восстановлено» на целых данных, кэш снимков и корзины, повтор записи после временного сбоя базы, освобождение места (`relieveQuota`), `withTimeout` для зависшей инициализации, отсутствие аварийного экрана при старте; просмотр заметки — полный текст без обрезки, закреплённая шапка с кнопками, Markdown и XSS, цвет тэга из таблицы, двойной клик/кнопка открывают редактор, закрытие кнопкой и Esc, обновление после сохранения, закрытие при удалении/смене папки/тэге/поиске/`resetNavigation`, `renderAll({ noteView: false })` не трогает панель, неизвестный id, фиксация/сброс ширины списка при открытии/закрытии, сохранение DOM списка; поиск — область «В папке» ограничивает выдачу, недоступность области в корне, путь и кнопка «в дереве» в результатах; быстрый переход `Ctrl+K` — открытие, группировка, префикс `@`, переход к тэгу; **новая заметка и рейтинг** — новая заметка в папке создаётся без тэгов, звёзды в редакторе/карточке/просмотре, сброс повторным кликом, нормализация 0–5, копирование при дублировании, отсутствие звёзд без оценки; клавиатурная навигация палитры, автодополнения тэгов и подсказок поиска; переход по тэгу раскрывает свёрнутую ветку и спрашивает подтверждение при несохранённых правках.

## Правила при правках

- Не добавлять внешние ресурсы и сборку; приложение остаётся одним файлом.
- Не переименовывать `notify()` в `toast`.
- Держать `window.__app` в синхроне с кодом.
- Использовать `storageGet/storageSet`, а не `localStorage` напрямую.
- Новый тяжёлый ключ (заметки, снимки, корзина и т.п.) добавлять в `HEAVY_KEYS`; настройки оставлять в `localStorage`.
- Не читать IndexedDB в обход `storageGet`/`storageInit`: синхронные вызовы должны видеть `memStore`.
- `storageInit()` должен завершиться до `loadState()` (см. `startApp`).
- Кэши хранения (`snapshotCache`, `trashCache`) сбрасывать в `storageClearMemory`; новые кэши снимков/корзины добавлять туда же, иначе тесты и импорт увидят старые данные.
- Запись в IndexedDB не гарантирована с первого раза: ключ после сбоя остаётся в `idbDirty` и повторяется. Не «оптимизировать» это удалением из очереди — иначе данные молча теряются.
- `saveToFile()` готовит payload и снимок состояния **синхронно**, до `await`; записи идут через `fileWriteChain`. Не добавлять `await` перед клонированием.
- Отложенные записи настроек (`deferSetting`) обязаны сбрасываться на `pagehide`/`visibilitychange`; новые «медленные» ключи проводить через тот же механизм.
- После мутаций заметок/тэгов — `invalidateTree()` (он же сбрасывает `treeDirty`, `treeRows`-пересборку, `tagsLowerCache` и `tagCountsCache`).
- Новые кэши рендера сбрасывать в `invalidateTree()`, чтобы не разъехались с данными.
- Не вешать обработчики на каждую карточку/строку дерева — только делегирование на `#notes`/`#tree`/`#noteView`.
- Выбор заметки не должен пересобирать список: `openNoteView` меняет только класс `.selected`, иначе сбрасывается прокрутка.
- Не менять в `.has-view` отступы/gap/высоту превью карточек: это меняет размер выбранной карточки. Ширину списка подгоняет `openNoteView`, а не CSS-оверрайды карточек.
- Смена папки/поиска/полная замена данных закрывает просмотр (`goToPath`, `onSearch`, `resetNavigation` → `viewingId = null`).
- Редактор — статическая разметка `#editorView`; `renderNoteView`/`renderAll` не должны её пересоздавать, иначе потеряются фокус, каретка и несохранённый текст.
- Любой переход из редактора (папка, заметка, тэг, поиск) обязан пройти через `guardUnsavedEditor()` или аналогичную проверку: сначала подтверждение, потом смена `currentPath`/`searchQuery`/`viewingId`. Нельзя менять навигацию до ответа пользователя.
- После `saveNote()` выставляйте `viewingId` на сохранённую заметку, а для новой — на созданный id: пользователь должен увидеть результат, а не пустую панель.
- Переходы по папкам не должны вызывать полную пересборку дерева: `renderTree()` сам решает, пересобирать или обновить состояние.
- После полной замены данных — `resetNavigation()`.
- Тэги хранить по id (`tagIds`), имена получать через `tagById`/`tagsOf`.
- Новая заметка не должна наследовать тэги `currentPath`: `openEditorPanel` для неё всегда выставляет `currentTags = []`.
- Переход к тэгу из карточки, просмотра или палитры — только через `goToTag()`: он сам подтверждает уход из редактора, очищает поиск и раскрывает ветку.
- Навигацию стрелками по спискам подсказок и палитры вести через `moveActiveItem()`, а не копировать блок в каждом обработчике.
- Рейтинг — целое 0–5: нормализовать только `clampRating()`, звёзды строить через `starsHtml()`; не выводить рейтинг в HTML, минуя эти функции.
- Соблюдать анти-XSS-правила и стиль секций `// ---------- Имя ----------`.
- Не ломать обратную совместимость: старый формат `tags: ['имя']` должен продолжать импортироваться.

## Порядок воссоздания (если понадобится переписать с нуля)

1. Разметка: шапка (файл/версии/диагностика/тэги/экспорт/импорт/тема/+заметка), сайдбар (поиск + сортировка + фасеты + дерево), контент (крошки + список + просмотр заметки + редактор справа), менеджер тэгов, палитра, универсальный диалог, `#toast`, скрытые `#fileInput` и `#printArea`.
2. CSS-переменные светлой/тёмной темы + адаптив ≤720px.
3. Модель: `normalizeNote`, `isEmptyNote`, `uid`, `clampRating`, таблица тэгов и `rebuildTagIndex`.
4. Хранилище: `storageGet/storageSet` + `memStore`, `HEAVY_KEYS`, `storageInit` (поднимает кэш до `loadState`, таймаут), `openIdb/idbGetAll/idbPut`, `queueIdbWrite/flushIdbWrites` с повторами, `relieveQuota`, `migrateLsToIdb`, кэши снимков/корзины, ключи, `loadState/saveState/saveTheme/saveCollapsed` и отложенная запись настроек.
5. Ядро тэгов: `tagsOf`, `permute`, `notePaths`, `noteBelongsToPath`, `buildTree` + кэш и `MAX_PERM_TAGS`.
6. Рендер: `renderTree/renderNode`, `renderBreadcrumbs`, `renderNotes`, `renderAll`, `matchesSearch`/`notesInPath`.
7. Просмотр заметки: `.content-split` + `#noteView`, `openNoteView/closeNoteView/renderNoteView`, `goToPath`.
8. Редактор в правой панели: `openEditor/openEditorPanel/closeEditor`, `guardUnsavedEditor`, `saveNote/deleteNote` + ввод тэгов (бейджи, подсказки, автодополнение).
9. Поиск `onSearch`, разбор запроса, фасеты, представления, подсказки.
10. Тема `toggleTheme/applyTheme`, уведомления `notify`.
11. Экспорт/импорт `serializeData/exportData/importData`, экспорт MD/TXT, печать.
12. File System Access API: `chooseFile/saveToFile/readFromFile/restoreFileHandle`, обработка отсоединения и конфликтов.
13. Надёжность: корзина, отмена, версионные снимки, история заметки, `saveLastView/restoreLastView`.
14. Мобильное: `toggleSidebar/closeSidebar/toggleSidebarIfMobile`, свайп, адаптив.
15. Горячие клавиши, контекстные меню, командная палитра, диалоги.
16. Обработка ошибок: `renderFatal` + `try/catch` инициализации + `window.onerror`.
17. Тест-хук `window.__app` и тесты в `tests/`.

## Известные ограничения

- Если недоступны и IndexedDB, и `localStorage`, данные живут только в памяти и теряются при перезагрузке — приложение предупреждает, доступны экспорт и файловое хранение. Если работает только база, то заметки сохраняются, а настройки (тема, свёрнутые папки, сортировка) — нет.
- На `file://` хранилище привязано к **папке** с HTML, а не к файлу: перенос HTML в другую папку или смена профиля браузера = «нет данных». OPFS на `file://` заблокирован (`SecurityError`), поэтому используется IndexedDB; перенос между машинами — только экспорт JSON или привязанный файл.
- Привязка локального файла не гарантируется после перезагрузки вкладки (зависит от поддержки IndexedDB и разрешений).
- Если у заметки больше 5 тэгов, в дереве/навигации участвуют только первые 5.
- История заметки — 20 снимков, корзина — 20, версионные снимки — 5; отмена — одноуровневая.
- Версионные снимки фиксируют изменение **состава** заметок, а не каждое редактирование текста (для текста есть `history` заметки).
- Список заметок не виртуализирован: если папка или поиск даёт тысячи совпадений, все карточки строятся сразу (в Chromium ~35 мс на 2000 карточек, но память и прокрутка растут линейно).
