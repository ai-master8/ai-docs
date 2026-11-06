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
| Persistence | `storageGet/storageSet`, `memStore`, `HEAVY_KEYS/LAZY_KEYS/EAGER_HEAVY_KEYS`, `storageInit`, `readLazyKey`, `openIdb/idbGetAll/idbPut`, `queueIdbWrite/flushIdbWrites/idbIdle`, `migrateLsToIdb`, `storageClearMemory`, `parseStoredState/envelopeRev`, `isQuotaError/relieveQuota/notifyQuota`, `deferSetting/flushDeferredSettings`, `deferStateSave/flushStateSave`, `withTimeout`, `requestPersistentStorage`, константы ключей, `loadState/saveState/writeStateEnvelope/saveTheme/saveCollapsed`, `markTabStale/requestTabConflict/readFreshState` |
| Таблица тэгов | `rebuildTagIndex`, `tagColorMap`, `ensureTag`, `tagName`, `getTagByName`, `sameName`, `pruneTagIds`, `normalizeNote`, `isEmptyNote`, `isValidData`, `applyData` |
| Версионные снимки | `loadSnapshots/saveSnapshots/snapshotsFinish/ensureSnapshotsLoaded/notesSignature/maybeSnapshot/makeSnapshotNow/restoreSnapshot/snapshotMenu`, `textDiffPreview`, `dataDiffSummary` |
| Корзина | `loadTrash/saveTrash/trashFinish/ensureTrashLoaded/moveToTrash/restoreFromTrash/emptyTrash/trashMenu` |
| Отмена | `prepareUndo/undoLastAction/redoLastAction/clearUndoHistory` |
| Notifications | `notify`, `showHelp`, `recordRuntimeError` |
| Tags / permutations | `permute`, `tagsOf`, `tagsLowerOf`, `searchHaystack`, `pathTagsOf`, `notePaths`, `allTags`, `noteBelongsToPath`, `invalidateTree`, `invalidateNoteCaches`, `buildTree` |
| Tree model / Rendering | `renderTree/renderNode`, `buildChildren`, `updateRowState/updateRowVisual`, `applyTreeState`, `toggleFolder`, `treeHandleClick/ContextMenu/DragOver/DragLeave/Drop`, `renderBreadcrumbs`, `renderNotes/noteCardHtml/notesCardsHtml`, `loadMoreNotes/appendMoreNotes/updateNotesMoreButton/loadAllNotesForEnd`, `virtualColumnsFor/virtualChunk/virtualOffsets/virtualRange/renderVirtualNotes/renderVirtualWindow/virtualEnsureVisible/refreshVirtualLayout/deactivateVirtual`, `previewText`, `safeCssColor/tagTextColor/colorToRgb/relativeLuminance`, `renderAll`, `isPathActive`, `expandAllTree/collapseAllTree/initTreeCollapse`, `allCollapsedExcept`, `humanDate`, `notesKeyNav/adjacentNoteCard/treeKeyNav`, `resetNotesRenderChunk`, `neighborNoteId/focusNoteOrFallback` |
| Массовые операции | `updateBulkBar/refreshBulkCards/clearBulkSelection/toggleBulkSelection/bulkSelectRange/bulkSelectAll/bulkSelectedNotes/bulkReady`, `bulkAddTags/bulkMove/bulkSetRating/bulkTogglePin/bulkDelete` |
| Просмотр заметки | `openNoteView/closeNoteView/renderNoteView`, `goToPath`, `goToPathRevealed/revealTreePath`, `findNoteCard/resetNoteListWidth`, `openWikiLink/noteByTitle/noteBacklinks/wikiLinkTitles` |
| Командная палитра | `paletteCommands`, `paletteScore`, `openPalette/closePalette/renderPalette/paletteKey` |
| Markdown | `escapeHtml`, `renderMarkdown`, `queryTerms`, `highlightElement` |
| Note selection / editor | `selectNote` (открывает просмотр), `openEditor/openEditorPanel/closeEditor`, `editorDirty/guardUnsavedEditor/updateEditorDirtyMark/remapEditorTags/requestCloseEditor`, `saveNote/deleteNote`, `renderRatingInput`, `addTagInput/addTag/removeTag/renderTagBadges/renderTagHints/tagInputKey`, `updateTagSuggest/applyTagSuggest`, `draftEntries/draftMenu/openDraft/clearAllDrafts/applyDraftToEditor`, `continueMarkdownList/indentMarkdown/listPrefixAt` |
| Markdown-предпросмотр | `updateMdPreview`, `updateMdWordCount`, `syncMdScroll`, `setMdMode`, `scheduleMdPreview/cancelMdPreview` |
| Тулбар Markdown | `applyMdFormat` |
| Поиск и замена в редакторе | `openFindBar/closeFindBar/mdFindNext/mdReplaceOne/mdReplaceAll` |
| Оглавление | `updateMdToc` |
| Search | `onSearch`, `setSearchScope/renderSearchScope/clearSearchField`, `inSearchScope/matchesSearchScoped/searchScopeNotes`, `tokenizeQuery/parseLocalDate/parseQuery/getParsedQuery/tagToken/joinQueryTokens`, `matchesSearch`, `notesInPath/notesForPath`, `fuzzyMatch`, `updateSearchSuggest/applySearchSuggest` |
| Фасеты | `renderFacets/cycleFacet/resetFacets/toggleFacets`, `ratingFacetToken/toggleRatingFacet`, `toggleExactFacet` |
| Сохранённые представления | `loadViews/saveViews/addView/deleteView/applyView/renderViews/promptSaveView`, `renameView/updateView/viewMenu` |
| Theme | `toggleTheme/applyTheme/effectiveTheme`, `themeMedia` (`prefers-color-scheme`) |
| File System Access API | `chooseFile/saveToFile/readFromFile/restoreFileHandle/destroyFileHandle/checkFileConflict/byteLength`, `openFileHandleDb/fileHandleTx/persistFileHandle/loadStoredFileHandle` |
| Управление тэгами | `renameTag/deleteTag/setTagColor/mergeTags` |
| Менеджер тэгов | `openTagManager/closeTagManager/renderTagManager/tagManagerColor/tagManagerRename/tagManagerMerge/tagManagerDelete/removeOrphanTags/findSimilarTagNames/highlightSimilarTags` |
| Контекстное меню | `showCtxMenu/closeCtxMenu/submenuFor`, `folderContextMenu/noteContextMenu/colorMenuFor/moveMenuFor/historyMenuFor/ratingMenuFor/trashMenu/snapshotMenu/sortMenu`, `copyWikiLink/copyNoteText` |
| Export / Import | `serializeData/exportData/importData`, `parseImportJson/importFailMessage`, `parseMarkdownImport`, `mergeImportedData/mergeTagTables`, `exportMd/exportTxt/printNotes/downloadText`, `exportMdText/exportTxtText/ratingText`, `exportFound` |
| Mobile | `toggleSidebar/closeSidebar/toggleSidebarIfMobile` + свайп |
| Универсальный диалог | `dialogShow/dialogClose/dialogConfirm/dialogPrompt`, `okLabel`/`extraLabel`/`thirdLabel` (результат `true`/`'extra'`/`'third'`/`false`) |
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

Два слоя. Тяжёлые данные — в IndexedDB, настройки — в `localStorage`. Снаружи всё синхронно: `storageGet`/`storageSet` читают и пишут `memStore` (кэш тяжёлых ключей), который наполняется в `storageInit()` до `loadState()`. **Снимки и корзина в этот стартовый набор не входят** — они читаются лениво при первом обращении. **Никогда не вызывайте `localStorage`/`indexedDB` напрямую** (исключения — `storageProbe()`, `storageInit()`, `readLazyKey()` и работа с дескриптором файла, где ошибки обрабатываются локально).

| Ключ | Где | Содержимое |
|---|---|---|
| `noteTreeData_v1` | **IDB** | `{ version: 2, rev, updatedAt, tags, notes }` (имя историческое, внутри схема v2; `rev` — номер ревизии для конфликтов вкладок) |
| `noteTreeData_v1_backup` | **IDB** | снимок состояния при загрузке страницы (защита от затирания) |
| `noteTreeSnapshots` | **IDB** | до 5 версионных снимков |
| `noteTreeTrash` | **IDB** | до 20 удалённых заметок |
| `noteTreeTheme` | LS | `'light'` / `'dark'` |
| `noteTreeCollapsed` | LS | JSON-массив ключей свёрнутых папок (`'работа/проект'`) |
| `noteTreeCollapsedDefaulted` | LS | `'1'` — стартовое сворачивание дерева уже применено |
| `noteTreeSort` | LS | `'updated'` / `'created'` / `'rating'` / `'title'` |
| `noteTreeLastView` | LS | `{ path: [...], q: '…', scope: 'all'\|'folder' }` — последнее место |
| `noteTreeDraft` | **IDB** | черновики несохранённого редактора: `{ drafts: { '<id заметки>': { noteId, title, body, tags, rating, ts }, '__new__': … } }` (до 20, общий размер до 512 КБ, старые и удалённые заметки вычищаются; старый одиночный формат читается) |
| `noteTreeViews` | LS | сохранённые представления (фильтры) |
| `noteTreeFileName` | LS | имя привязанного файла (для диагностики) |
| IndexedDB `noteTreeFileHandle` | IDB | дескриптор файла (File System Access API) |

- **`HEAVY_KEYS`** (`noteTreeData_v1`, `..._backup`, `noteTreeSnapshots`, `noteTreeTrash`, `noteTreeDraft`) — единственный список того, что живёт в базе `noteTreeDB` / store `kv`. Добавляя новый тяжёлый ключ, добавьте его сюда. **`LAZY_KEYS`** (`noteTreeSnapshots`, `noteTreeTrash`) — подмножество, которое не читается на старте; `EAGER_HEAVY_KEYS` = `HEAVY_KEYS` минус ленивые.
- `storageInit()`: открывает базу, одним чтением поднимает **только `EAGER_HEAVY_KEYS`** (заметки, резерв, черновики) в `memStore`, затем `migrateLsToIdb()` переносит старые значения из `localStorage` и удаляет LS-копию **только после подтверждённой записи**. Снимки и корзину переносит `readLazyKey()` при первом чтении. Если IndexedDB недоступна — `idbMode = false`, всё работает по-старому через `localStorage`. Открытие ограничено `IDB_INIT_TIMEOUT` (3 с, `withTimeout`): зависший `open()` не оставляет приложение с пустым экраном, а позднее соединение закрывается (`idbAbandoned`).
- **Ленивые снимки и корзина.** `loadSnapshots()`/`loadTrash()` в режиме базы до первого чтения отдают пустой кэш и запускают `ensureSnapshotsLoaded()`/`ensureTrashLoaded()` (фон, с тем же таймаутом). Меню версий, диагностика и восстановление сами ждут `ensure*Loaded()` (когда `idbMode`), а в localStorage-режиме читают синхронно и меню открывается в том же тике. Записи до завершения чтения **буферизуются**: `maybeSnapshot`/`saveSnapshots` кладут снимки в `pendingSnapshots`, `moveToTrash`/`saveTrash` — в `pendingTrash`; после чтения `snapshotsFinish`/`trashFinish` сливают буфер с прочитанным (новые впереди, старые не затираются). `readLazyKey(key)` читает ключ из базы, а при отсутствии — из старой копии `localStorage` с переносом в базу.
- `storageSet()` для тяжёлого ключа в режиме базы пишет в `memStore` сразу и ставит ключ в очередь `queueIdbWrite()`. По ключу одновременно идёт не больше одной транзакции, промежуточные значения схлопываются. При сбое ключ **возвращается в очередь** (`idbDirty`) и повторяется до `IDB_RETRY_MAX` (3) раз с растущей паузой; только после этого — один тост за сессию (`notifyStorageFailure`). `flushIdbWrites()` вызывается на `pagehide`/`visibilitychange` и пытается дописать всё немедленно; `idbIdle()` (тесты, аккуратное закрытие) сначала ждёт ленивые чтения, потом очередь записи.
- Переполнение (`QuotaExceededError`, `relieveQuota()`): сначала удаляется половина старых снимков, затем половина корзины, запись повторяется; пользователю один раз показывается совет про экспорт. Работает и для `localStorage`-режима, и для IndexedDB. Непрочитанные ленивые ключи при этом не трогаются.
- `loadState()` — **async**: `parseStoredState()` → при повреждённом JSON данные поднимаются из `noteTreeData_v1_backup`, затем из последнего снимка (`lastRecovery` = `backup`/`snapshot`, виден в диагностике и в тосте); если снимки ещё не прочитаны, ожидается `ensureSnapshotsLoaded()`. Затем `applyData` → backup-ключ (`>0` заметок) → `maybeSnapshot()` → тема → режим сортировки → свёрнутые папки → `applyTheme()`. В localStorage-режиме синхронная часть выполняется до первого `await`, поэтому старые тесты без `await` работают. Если недоступно всё (`!storageAvailable && !idbMode`) — предупреждение через `notify`; если работает только база — предупреждение лишь про настройки.
- `saveState()` перед записью проверяет `staleData`: если другая вкладка сохранила более новую ревизию, запись **не выполняется**, показывается диалог конфликта (см. «Несколько вкладок»), функция возвращает `false`. Иначе `writeStateEnvelope()` увеличивает `rev`, пишет `{ version: 2, rev, updatedAt, tags, notes }`, вызывает `maybeSnapshot()` и рассылает `saved` с ревизией. Частые действия (оценка с карточки, переключение задач) используют `deferStateSave()`: серия кликов сериализует архив один раз через `STATE_SAVE_DEBOUNCE` (300 мс), а `flushStateSave()` вызывается на `pagehide`/`visibilitychange` и стирает очередь в `storageClearMemory()`.
- **Несколько вкладок**: `initTabSync()` открывает `BroadcastChannel('tag-tree-tabs')`; каждая вкладка при старте шлёт `hello`, отвечает `here` и получает предупреждение (обе стороны). Сообщения несут `rev`; `markTabStale(rev)` поднимает `knownRev` и при чужой более новой ревизии ставит `staleData`. В localStorage-режиме без BroadcastChannel то же делает обработчик события `storage` по ключу `noteTreeData_v1`. После `saveState()` рассылается `saved`, и другая вкладка один раз показывает совет. При попытке записи устаревшей копии `requestTabConflict()` открывает диалог с тремя вариантами: **«🔄 Перечитать»** (`reloadFromStorage(true)` — правки этой вкладки отбрасываются), **«🔗 Объединить»** (`readFreshState()` → `mergeImportedData(remote, { preserveConflicts: true })`, заметки сопоставляются по id, побеждает более новый `updated`; проигравшая версия при отличающемся содержимом сохраняется отдельной заметкой «… (конфликтная копия)», поэтому текст не теряется) и **«💾 Перезаписать»** (`writeStateEnvelope()` поверх чужой ревизии). Для третьей кнопки у `dialogShow` есть `thirdLabel`/`#dialogThirdBtn` (результат `'third'`). `saveToFile()` при `staleData` тоже не пишет файл. `reloadFromStorage()` — команда палитры «🔄 Перечитать данные из хранилища»: сбрасывает отложенные записи и кэши (`flushDraftSave`, `cancelDeferredStateSave`, `storageClearMemory`), вызывает `storageInit()`/`loadState()`, `clearUndoHistory()`, `resetNavigation()`, `renderAll()`, `renderViews()`; при несохранённых правках сначала `guardUnsavedEditor`.
- Снимки (`maybeSnapshot`) создаются при **изменении состава заметок** (сигнатура `count:ids`), а не при каждом редактировании текста. Автоснимки прореживаются: не чаще одного раза в `SNAPSHOT_MIN_INTERVAL` (5 минут), поэтому серия добавлений/удалений не плодит полные копии архива. Саму сигнатуру `notesSignature()` кэширует по ссылке на массив и его длине, чтобы не сортировать все id на каждое сохранение. Список снимков держится в памяти (`snapshotCache`), поэтому `saveState()` не парсит до пяти полных копий архива на каждое сохранение. **До ленивой загрузки** снимки копятся в `pendingSnapshots` и не перезаписывают прочитанную историю. Восстановление — «🕘» (`snapshotMenu`, ждёт `ensureSnapshotsLoaded()` в режиме базы). Перед восстановлением `dataDiffSummary()` показывает, сколько заметок добавится/удалится/изменится и какие тэги появятся или пропадут. Пункт «📸 Сделать снимок сейчас» (`makeSnapshotNow` → `maybeSnapshot(true)`) доступен в этом меню и в палитре: он фиксирует состояние даже без изменения состава.
- История версий заметки (`historyMenuFor`) тоже показывает diff: `textDiffPreview(текущий, восстанавливаемый)` строит «− сейчас / + станет» по строкам с общим префиксом/суффиксом и обрезкой, поэтому диалог остаётся читаемым на длинном тексте.
- Корзина тоже кэшируется в памяти (`trashCache`) и загружается лениво; `saveTrash()` пишет через кэш и обрезает до `TRASH_MAX`, а до загрузки складывает удаления в `pendingTrash` (старые записи не теряются).
- Настройки (`saveLastView`, `saveCollapsed`) пишутся с задержкой `SETTINGS_DEBOUNCE` (250 мс): при быстрых переходах/сворачиваниях остаётся одна запись. Очередь сбрасывается на `pagehide`/`visibilitychange` (`flushDeferredSettings`), отменяется в `storageClearMemory`. `resetNavigation()` пишет свёрнутость сразу (`saveCollapsed(true)`).
- Диагностика: `storageProbe()` возвращает `idbMode`/`idbError`, `unsaved` (ключи, не дошедшие до базы) и `recovered`; `showDiagnostics()` сначала поднимает ленивые снимки/корзину (`ensure*Loaded()`), затем добавляет `navigator.storage.estimate()`, `navigator.storage.persisted()` (работает и на `file://`) и строку о несохранённых ключах. `requestPersistentStorage()` при старте просит браузер не вытеснять данные.
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
- `buildTree()` кэшируется (`treeCache`). Заметки с одинаковым набором тэгов группируются, перестановки для группы считаются один раз, а id добавляются по уникальным префиксам путей (для 5 тэгов — 325 вместо 600 шагов), поэтому пересборка на 5 тыс. заметок с 5 тэгами заметно быстрее. После мутаций заметок/тэгов **обязательно** `invalidateTree()`, иначе рендер покажет старые данные.
- `currentPath` и ключи `collapsed` — массивы/строки **имён** тэгов. При `renameTag`/`deleteTag`/`mergeTags` они пересчитываются, сравнение — регистронезависимое (`sameName`).
- `renameTag` проверяет дубль имени; `deleteTag` вычищает `tagIds` через `pruneTagIds`; `mergeTags` переносит ссылки без дублей и сохраняет цвет целевого.

## Рендеринг

```js
renderAll(opts) → renderSearchScope() + renderTree() + renderBreadcrumbs() + renderFacets() + renderNotes() + renderNoteView() + saveLastView()
// opts: { tree, crumbs, facets, notes, noteView, view } — любой можно выключить (false)
```

- **Дерево инкрементальное.** `treeRows` — реестр «ключ пути → узел» (`row`, `chev`, `icon`, `childrenDiv`, `node`). `renderTree()` пересобирает DOM только когда `treeDirty` (его поднимает `invalidateTree()`), иначе вызывает `applyTreeState()`. Обычная навигация/поиск обновляет только предыдущую и новую активную строку (`.active`), а шевроны, цвета и видимость детей пересчитываются (`updateRowVisual`) лишь при `treeStateDirty` — его ставят `toggleFolder` и смена цвета тэга. Поэтому переход по папкам, поиск и `renderAll({ tree: false })` не пересоздают сотни строк. **Доступность:** `#tree` имеет `role="tree"`, строки — `role="treeitem"`, `aria-level` (глубина пути), `aria-expanded` (для папок с детьми) и `aria-selected` (активная папка); `childrenDiv` — `role="group"`, обёртка `.node` — `role="none"`. `updateRowState`, `updateRowVisual` и `applyTreeState` синхронизируют эти атрибуты вместе с классами.
- **Сворачивание** (`toggleFolder`) прячет готовый `childrenDiv` (убирает из DOM, чтобы `treeKeyNav` не видел скрытых строк) и кэширует его в записи узла — повторное разворачивание не строит DOM заново. `expandAllTree`/`collapseAllTree` ставят `treeDirty = true` и пересобирают дерево.
- **Первый запуск**: при отсутствии отметки `noteTreeCollapsedDefaulted` `initTreeCollapse()` один раз сворачивает все ветки с детьми (`allCollapsedExcept`) и оставляет видимой только ветку последнего места (`currentPath`). Поэтому при открытии приложение не разворачивает всё дерево; дальнейшие запуски уважают сохранённую пользователем свёрнутость.
- **Обработчики делегированы**: на `#tree` висят `treeHandleClick/ContextMenu/DragOver/DragLeave/Drop`, на `#notes` — click/contextmenu/dragstart. На самих строках и карточках обработчиков нет (важно для больших списков).
- **Карточки** (`renderNotes`) собираются одной HTML-строкой и вставляются одним `innerHTML`. Пользовательский текст — только через `escapeHtml`, превью — через `renderMarkdown`; цвета тэгов проходят `safeCssColor` (hex/rgb/hsl/имя цвета), чтобы импортированные данные не попали в `style`. Рейтинг выводится звёздами в строке `.dt` (только если оценка > 0). Подсветка — после вставки, по `.preview`.
- **Просмотр заметки** (`.content-split` + `#noteView`): клик по карточке (`selectNote` → `openNoteView`) показывает заметку целиком справа — заголовок, тэги, рейтинг, даты и полный Markdown (`renderMarkdown`). Список при этом сужается до одной колонки (`.has-view`), но карточка не меняет размер: `openNoteView` запоминает её ширину до открытия, выставляет ширину списка через `notes.style.flex` и при необходимости корректирует её; `resetNoteListWidth()` снимает фиксацию при закрытии. Прокрутка не сбрасывается: `openNoteView` только переключает `.selected` на существующих карточках и при необходимости `scrollIntoView`. Шапка `.nv-head` («✕ Закрыть» и «✎ Редактировать») закреплена, а прокручивается только текст в `.nv-scroll`, поэтому кнопки всегда видны. Закрытие — «✕ Закрыть» / Esc / «← К списку» на узких экранах (≤900px список скрывается). **Редактор открывается в этой же правой панели** (`#editorView`, класс `.has-editor`): просмотр при этом скрыт, дерево и список остаются, а `.has-view` продолжает удерживать ширину списка. `renderNoteView` при отсутствии заметки закрывает панель только если редактор не открыт (иначе панель нужна для новой заметки), а `goToPath` и `onSearch` сбрасывают `viewingId`, чтобы не показывать заметку вне контекста.
- **Обработчики просмотра делегированы** на `#noteView` (`.nv-close`, `.nv-edit`, `.nv-tags .tag`, задачи `.md-ul.todo li[data-task]`); `#notes` дополнительно слушает `dblclick`. **Задачи в Markdown кликабельны**: `renderNoteView` проставляет `role="checkbox"`, `aria-checked`, `tabIndex`; клик или `Enter`/`Space` вызывают `toggleNoteTask(id, index)` → `toggleTaskLine(body, index)` (переключает `[ ]`/`[x]` в n-й строке), пишет историю, сохраняет и перерисовывает просмотр и карточки без потери прокрутки.
- **Крошки** (`renderBreadcrumbs`): «🏠 Все без тэга» → сегменты `currentPath` (кнопки с клавиатурным фокусом; текущий сегмент помечен `aria-current`); счётчик справа — «N найдено» (в режиме «В папке» — «N найдено в папке») при поиске, иначе «N заметок».
- **Список**: при непустом `searchQuery` — поиск по области `searchScope` (`searchScopeNotes()`), иначе — `notesInPath()`. Обе функции берут готовый набор из `buildTree().ids` через `notesForPath()`, а не перебирают весь архив. Затем `sortNotes()` и закреплённые (`pinned`) наверх. **Порционная отрисовка**: для списков до `VIRTUAL_THRESHOLD = 400` заметок сначала строятся не больше `NOTES_CHUNK = 200` карточек, остальные подгружаются кнопкой `#notesMoreBtn` («Показать ещё N из M»), прокруткой к концу (`scrollTop + clientHeight >= scrollHeight - 240`) или `loadMoreNotes()`. `loadMoreNotes()` → `appendMoreNotes()` добавляет только новую порцию через `insertAdjacentHTML`, не пересобирая уже показанные карточки. Лимит `notesRenderLimit` сбрасывается при смене поиска/папки/сортировки (`notesRenderKey`) и через `resetNotesRenderChunk()` (тесты, полная замена данных). Если открытая/выбранная заметка оказалась за границей порции, лимит увеличивается до её индекса. Стрелка вниз/вправо с последней загруженной карточки подгружает следующую порцию, `End` (`loadAllNotesForEnd`) — весь список порциями через `requestAnimationFrame`. **Виртуализация**: если заметок больше `VIRTUAL_THRESHOLD` (400) и у контейнера ненулевая высота, `renderNotes()` вызывает `renderVirtualNotes()`: список превращается в блочный `.notes.virtual` с рядами `.virt-row` по `virtualColumnsFor(clientWidth)` колонок и двумя распорками `.virt-spacer`. В DOM живут только видимые ряды плюс `VIRTUAL_OVERSCAN = 6` сверху/снизу (`virtualRange` — бинарный поиск по `virtualOffsets`), высоты рядов измеряются после отрисовки (`virtualHeights`, оценка `VIRTUAL_ROW_ESTIMATE = 214`) и компенсируют прокрутку, чтобы карточки не «прыгали». Прокрутка вызывает `scheduleVirtualRender()`, изменение ширины/открытие правой панели — `refreshVirtualLayout()`, `virtualEnsureVisible()` доводит нужную карточку (клавиатура, `End`, `findNoteCard`). В jsdom и скрытой панели (`clientHeight = 0`) виртуализация выключена — работает обычная порционная отрисовка. **Массовое выделение**: `Ctrl/Cmd+клик` — `toggleBulkSelection()`, `Shift+клик` — `bulkSelectRange()` (в виртуальном режиме по индексам `notesCurrentList`), кнопка «Выбрать все» — `bulkSelectAll()` (весь текущий список, не только порция), панель `.bulk-bar` (`#bulkBar`) показывает `updateBulkBar()`. Карточка `.note-card`: заголовок, превью (`previewText` → Markdown, обрезка 140 символов + `…`; строки таблиц выкидываются — в 96px они нечитаемы; очищенный текст кэшируется по id/телу в `previewTextCache`), кликабельные тэги, человекочитаемая дата; drag-and-drop в папку (`text/note-id`); `tabIndex` и клавиатурная навигация. В результатах поиска дополнительно показывается путь заметки (`pathTagsOf` → «a / b», для корня — «Без тэга») и кнопка «в дереве» (`.np-show` → `goToPathRevealed`), которая очищает поиск, раскрывает нужную ветку и переходит в неё.
- Пустые состояния: единый блок `.empty` с иконкой, заголовком и подсказкой. Для поиска — «Ничего не найдено» / «В этой папке ничего не найдено» и кнопка сброса поиска; для пустой папки — создание заметки; для пустого архива — «📂 Открыть файл данных»; для корня с заметками только в ветках — подсказка про дерево.
- `humanDate`: «только что», «N мин назад», «сегодня, ЧЧ:ММ», «вчера, ЧЧ:ММ», затем дата (`12 окт` / с годом).
- `saveLastView()` пишет в `localStorage` только при изменении пути/запроса/области и с задержкой 250 мс (`deferSetting`); очередь сбрасывается на `pagehide`/`visibilitychange`, поэтому при закрытии вкладки место всё равно сохраняется.

## Поиск

`onSearch(v)` пишет `searchQuery`, закрывает открытый просмотр (`viewingId = null`) и перерисовывает `renderNotes()` + `renderBreadcrumbs()` + `renderFacets()` + `renderSearchScope()`, сохраняя место. Поле `#search` вызывает его с debounce 120 мс; прямые вызовы (`onSearch('')`, фасеты, представления, автодополнение) — синхронные.

- **Область поиска** (`searchScope`, кнопки «Везде» / «В папке» под полем): `setSearchScope('all'|'folder')` переключает и сразу пересчитывает список, крошки и фасеты. В корне (`currentPath` пуст) режим «В папке» недоступен (`renderSearchScope` отключает кнопку и сбрасывает область на `all`). `inSearchScope(n)` ограничивает набор `currentPath`, `matchesSearchScoped(n)` = область + `matchesSearch(n)`, `searchScopeNotes()` — готовый список. Этой областью пользуются список, крошки, фасеты и «Экспорт найденного». Сохранённое представление хранит область и сортировку, поэтому `applyView` восстанавливает их; область `folder` в корне сбрасывается в `all` через `renderSearchScope`.
- **Клавиши**: `/` (не в поле ввода) фокусирует `#search` и выделяет текст; `Esc` в поле сначала закрывает автодополнение, затем очищает запрос (`clearSearchField`). Кнопка «✕» внутри поля (`#searchClear`, `updateSearchClear`) видна при непустом запросе и очищает его мгновенно, отменяя отложенный ввод.

Синтаксис (`tokenizeQuery` → `parseQuery`, результат кэшируется `getParsedQuery()`):

| Токен | Смысл |
|---|---|
| `#тэг` | обязательный тэг (точное имя) |
| `#"тэг с пробелом"` | имя с пробелами — в кавычках |
| `-тэг` / `!тэг` | исключить тэг |
| `title:слово` | подстрока в заголовке (все такие токены обязательны) |
| `rating:4`, `rating:>=4`, `rating:<3` | оценка; операторы `= >= <= > <`, `0`/`none`/`нет`/`без` — без оценки |
| `pinned:true` / `pinned:false` | только закреплённые / только обычные (`1`/`0`, `yes`/`no`, `да`/`нет`) |
| `task:open` / `task:done` / `task:any` | есть незавершённые / завершённые / любые задачи Markdown |
| `links:orphan` / `links:in` / `links:out` / `links:linked` | без входящих и исходящих ссылок / есть входящие / есть исходящие / есть любые |
| `since:YYYY-MM-DD` / `until:YYYY-MM-DD` | диапазон по `updated` (локальная дата; `until` включает весь день) |
| `created:YYYY-MM-DD`, `created:>=YYYY-MM-DD` | дата создания; операторы `= >= <= > <` |
| `слово1\|слово2` | ИЛИ внутри одного токена (в т.ч. `title:`) |
| прочий текст | подстрока в заголовке/теле/тэгах, логика «И» |

- `parseQuery` разбирает `created:` в `parts.created` (`range` для точного дня или `{op, value}`), нормализует пробел после `since/until/created:`. Свободный текст и `title:` поддерживают альтернативы через `|`; `queryTerms()` разворачивает их для подсветки.
- `matchesSearch`: include-тэги — все и точные, exclude — точные, свободные токены — каждый должен найтись («И», альтернативы внутри токена — «ИЛИ»), `title:` — все в заголовке, `rating:` — все условия по оценке («И»), `pinned:` — по флагу, `task:` — по задачам (`taskStats`), `links:` — по входящим/исходящим `[[…]]`, `since/until` — по `updated || created`, `created:` — по `created`. Имена тэгов заметки берутся из кэша `tagsLowerOf(n)`, а поисковый текст (заголовок + тело в нижнем регистре) — из `searchHaystack(n)`; оба кэша сбрасываются в `invalidateTree()`, а точечно — `invalidateNoteCaches(n)`. Невалидный `rating:`/`created:`-токен попадает в свободный текст.
- `tagToken(name, prefix)` сериализует тэг обратно в токен (кавычки при пробелах); используется фасетами и представлениями.
- **Подсветка**: `queryTerms()` кэширует термы по строке запроса и переиспользует `getParsedQuery()`, поэтому `highlightElement` не парсит запрос для каждой карточки.
- **Автодополнение `#`**: `#searchSuggest`, кандидаты — `allTags()` через `fuzzyMatch` (подстрока или subsequence: `рбт` → `работа`), ↑/↓/Enter/Esc.
- **Фасеты** (`#facets`): динамические — строятся по заметкам, уже прошедшим include-фильтры; счётчик — сколько заметок с тэгом в текущем сочетании. Активные берутся из запроса, а не из таблицы, и видны всегда (`.on` / `.excl`). Shift/Alt/правый клик — исключить. `cycleFacet` пере-экранирует оставшиеся тэги и не трогает свободный текст, даже если он совпал с именем тэга. `resetFacets` полностью очищает поиск. Над тэгами — чипы оценки (`★ 3+`, `★ 4+`, `★ 5`, «Без оценки»): `toggleRatingFacet` заменяет только `rating:`-токены, сохраняя остальной запрос; `ratingFacetToken` подсвечивает активный чип. Второй ряд — быстрые чипы «📌 Закреплённые» (`pinned:true`), «✅ Открытые задачи» (`task:open`) и «🔗 Без ссылок» (`links:orphan`): `toggleExactFacet` включает/снимает точный токен, а `joinQueryTokens` заново экранирует тэги с пробелами, чтобы остальной запрос не ломался. Счётчик активных фасетов учитывает тэги, оценку, `pinned:`, `task:` и `links:`.
- **Представления**: `addView(name, query, sort, scope)` → `noteTreeViews` как `{ name, query, sort, scope }`, `applyView` (принимает объект или старую строку), `deleteView`, кнопка «💾 Сохранить фильтр» (`promptSaveView`). У каждого представления есть кнопка «⋯» и правый клик (`viewMenu`): применить, **обновить текущим фильтром** (`updateView` — запрос, сортировка и область), **переименовать** (`renameView`, имя остаётся уникальным) или удалить. Старые представления-строки продолжают работать.

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
- если для этой заметки есть более свежий черновик (`readStoredDraft(id)`), восстанавливает заголовок/тело/тэги/оценку и показывает «↩ Восстановлен несохранённый черновик»; `editorSnapshot` при этом остаётся снимком сохранённой версии, поэтому индикатор «не сохранено» горит;
- запоминает `editorSnapshot` для отслеживания несохранённых изменений; шапка показывает `#editorDirtyMark` («● не сохранено»).

Поведение:

- `editorDirty()` сравнивает заголовок, тело, черновик `#fTags`, `editorRating` и `currentTags`; `updateEditorDirtyMark()` обновляет индикатор на ввод. Несохранённые правки автосохраняются в `noteTreeDraft` (IndexedDB, в localStorage-режиме — LS) **по каждой заметке** (`{ drafts: { id: … , '__new__': … } }`) через `scheduleDraftSave()` (500 мс), `flushDraftSave()` вызывается на `pagehide`/`visibilitychange`. `readStoredDraft(key)`/`clearStoredDraft(key)` работают с ключом заметки (без аргумента — текущая/новая), `writeDraftStore()` чистит черновики удалённых заметок, старше 30 дней, сверх 20 последних и сверх общего лимита `DRAFT_BYTES_LIMIT` (512 КБ), а `readDraftStore()` понимает старый одиночный формат. Черновик очищается после сохранения, удаления и подтверждённого отказа.
- **Менеджер черновиков** (`draftMenu`, «🕘 Версии данных → 📝 Черновики», палитра): `draftEntries()` отдаёт черновики по свежести, `draftLabel()` показывает заголовок, тип («новая» / «правка» / «удалённая») и возраст. `openDraft(key)` открывает редактор нужной заметки (для удалённой или `__new__` — пустой редактор) и принудительно применяет черновик через `applyDraftToEditor()` — даже если заметка уже новее черновика. `clearAllDrafts()` после подтверждения очищает `noteTreeDraft` (текущий открытый редактор не трогается, его правки запишутся заново при вводе). Уход из редактора идёт через `guardUnsavedEditor()`.
- `requestCloseEditor()` (Esc, ✕, «Отмена») при изменениях спрашивает подтверждение. `closeEditor({ silent: true })` закрывает без вопросов и используется после сохранения/удаления/навигации; обычное закрытие возвращает к просмотру заметки, а для новой — к списку.
- **Защита от потери правок**: `guardUnsavedEditor(message, action)` спрашивает и выполняет действие только после подтверждения. Через него проходят `openEditor`, `openNoteView`, `goToPath`, переходы к тэгу/папке из палитры и карточек. `onSearch()` проверяет правки сам и при отмене возвращает в поле прежний запрос.
- `remapEditorTags(mapper)` вызывается из `renameTag`/`deleteTag`/`mergeTags`: имена тэгов в открытом редакторе обновляются вместе с таблицей, иначе сохранение воскресило бы старый тэг.
- Esc при открытых палитре/диалоге/менеджере тэгов закрывает их, а не редактор.
- `saveNote()`: если в `#fTags` остался необработанный текст — сначала `addTagInput()`; пустая заметка не сохраняется; имена тэгов → id через `ensureTag()`; `rating` берётся из `editorRating`; `pushHistory` только если реально изменились заголовок/тело. `updated` обновляется только при изменении заголовка, тела или тэгов — смена одной оценки дату не трогает. При смене заголовка существующей заметки `renameWikiLinks()` обновляет `[[старое имя]]` во всех заметках (с записью в их историю). После сохранения `viewingId` указывает на сохранённую (в т.ч. новую) заметку, редактор закрывается, `renderAll()` показывает её в режиме чтения.
- `deleteNote(id)`: подтверждение → `prepareUndo` → в корзину → удаление → сохранение/рендер. Без `id` удаляется заметка из редактора; контекстное меню и клавиатура передают id явно, чтобы не сбить состояние редактора.
- `moveNoteToTag(noteId, tag)`: перемещение = **единственный** тэг папки (`tagIds = [id]`, `null` — корень); текущая папка не сбрасывается.
- Ввод тэгов: `,` и `/` режут на несколько; дедупликация без учёта регистра; бейджи с ✕; подсказки до 8; автодополнение до 10 (`updateTagSuggest`, ↑/↓/Enter/Esc).

### Рейтинг заметки

- `rating` — целое 0–5 (0 — без оценки). Нормализуется `clampRating()`, звёзды собирает `starsHtml(rating, interactive)` (закрашенные `★`, пустые `☆`, `aria-label` с оценкой). `ratingText(rating)` даёт строку `★★★★☆` для экспорта/печати (пустая при 0).
- В редакторе — `#fRating` с пятью кнопками `.star-btn`; состояние хранит `editorRating`. Клик по звезде ставит оценку, повторный клик по той же — сбрасывает в 0. `renderRatingInput()` обновляет символы, `.on` и `aria-pressed`.
- На карточке звёзды рисуются всегда (`starsHtml(n.rating, true)`, `.star.hit` с `data-rating`) и кликабельны: `rateNoteFromCard(id, value)` ставит оценку, повторный клик сбрасывает. Список при этом не пересобирается (прокрутка сохраняется) — заменяется только блок `.stars`; полный `renderNotes()` — лишь при сортировке по оценке, после него фокус возвращается на карточку (`findNoteCard`). Если эта заметка открыта в редакторе, `editorRating` синхронизируется. Клик/двойной клик/перетаскивание по звёздам не открывает просмотр и редактор.
- `rateNoteFromCard` — toggle-обёртка над `setNoteRating(id, value, toggle)`; контекстное меню (`ratingMenuFor`) вызывает `setNoteRating` без toggle (выбор той же оценки не сбрасывает её). `notesKeyNav` ставит оценку клавишами `1–5`, `0` — сброс.
- Рейтинг виден на карточке (в строке `.dt`) и в шапке просмотра (`.nv-rating`). Дублирование (`duplicateNote`) копирует рейтинг; в историю версий он не попадает (история — только заголовок и тело).
- Сортировка «По оценке» (`SORT_MODES` → `rating`, `sortNotes`): оценка по убыванию, при равенстве — по `updated`; неоценённые в конце. Закреплённые по-прежнему сверху.
- Сортировка «По релевантности» (`relevance`): `searchRelevance(n)` даёт больше очков точному/начальному совпадению в заголовке, затем числу вхождений в тексте и точному имени тэга; при равенстве — по `updated`. Без запроса все оценки равны.

### Markdown-редактор

- Режимы `setMdMode('edit'|'split'|'preview')`: только ввод / ввод + живой предпросмотр с синхронным скроллом / только предпросмотр. `openEditor` всегда открывает `edit`.
- Тулбар `.md-tb[data-cmd]`: H1–H3, bold, italic, strike, code, ul, ol, list-todo, quote, link, hr, table, clear. `applyMdFormat(cmd)` вставляет/оборачивает разметку вокруг выделения. В теле заметки работают `Ctrl/Cmd+B` (жирный), `Ctrl/Cmd+I` (курсив) и `Ctrl/Cmd+Shift+K` (ссылка; обычный `Ctrl+K` остаётся палитрой).
- **Enter продолжает список** (`continueMarkdownList`): маркер `-`/`*`/`+`, номер или `- [ ]` переносятся на новую строку; пустой пункт удаляет маркер и выходит из списка. `Tab`/`Shift+Tab` (`indentMarkdown`) добавляют или убирают отступ в две клетки — и для курсора, и для выделенных строк.
- `renderMarkdown(src)` — безопасный поднабор: заголовки, списки (`md-ul`, `md-ul.todo`, `<ol>`), цитаты, `---`, инлайн- и блочный код, жирный/курсив/зачёркнутый, ссылки, таблицы (внутри блока кода не парсятся; оборачиваются в `.md-table-wrap`, чтобы широкая таблица прокручивалась, а не растягивала страницу). **Весь HTML экранируется**; ссылки допускаются только `http:`, `https:`, `mailto:`. Пустые строки сохраняются как `<div class="md-gap"><br></div>` — ровно одна пустая строка на каждую (ведущие и хвостовые отбрасываются), поэтому абзацы не слипаются. Внутренние ссылки `[[Заголовок]]` рендерятся как `<a class="wikilink" data-wikilink="…">` **после** экранирования; в просмотре клик ведёт к заметке (`openWikiLink`), а под текстом показываются обратные ссылки (`noteBacklinks`).
- Примечание: класс `.md-ul` стилизован глобально (не только в `#mdPreview`), чтобы превью в карточках выглядело так же.
- `Ctrl+H` — поиск/замена (`#mdFindbar`), без учёта регистра, замена одного/всех.
- Живой предпросмотр при вводе обновляется с задержкой 100 мс (`scheduleMdPreview`/`cancelMdPreview`); счётчик слов — сразу. `setMdMode`, сохранение и закрытие редактора отменяют отложенный рендер.
- `updateMdToc()` — кнопки H1–H3 над предпросмотром при ≥2 заголовках; пересобираются только при изменении набора заголовков (сигнатура `уровень:строка:текст`), позиция при клике считается по актуальному тексту.
- Счётчик `#mdWordCount` — «N слов · M симв».

## История, отмена, корзина, снимки

- **История заметки**: `history` до 20 снимков; `pushHistory(n)` перед перезаписью изменённого текста; меню заметки → «🕘 История версий» (10 последних) → `restoreHistory` (текущее состояние тоже сохраняется в историю).
- **Отмена (Ctrl+Z)**: `prepareUndo(label)` перед удалением заметки/тэга, слиянием, очисткой; `undoLastAction()` — многоуровневая (стек `undoStack` до `UNDO_MAX = 20` и до `UNDO_MEMORY_LIMIT` ≈ 24 МБ суммарно; самые старые шаги вытесняются), `redoLastAction()` — повтор (`redoStack`, `Ctrl+Shift+Z`/`Ctrl+Y`). Новое действие очищает повтор; `clearUndoHistory()` сбрасывает оба стека при полной замене данных. Не работает в полях ввода и при открытом редакторе.
- **Корзина**: `noteTreeTrash`, до 20 записей; `moveToTrash/restoreFromTrash/emptyTrash`, меню «🕘 Версии данных → 🗑 Корзина».
- **Снимки**: до 5, ротация; восстанавливаются через `snapshotMenu` (с подтверждением), заменяют данные и сбрасывают навигацию.
- Меню «🕘 Версии данных» (`#backupBtn` → `snapshotMenu`): список снимков с датой и числом заметок, «🗑 Корзина (N)» и «♻️ Резервная копия (файл/браузер)». Кнопка переключает меню и вызывает `stopPropagation()`, иначе документный обработчик «клик вне меню» закроет его сразу после открытия.

## Экспорт, импорт, файловое хранение

- `serializeData()` → `{ app: 'note-tree', version: 2, exported, tags, notes, views, backup }`; `views` — сохранённые представления, `backup` — глубокий снимок прошлого успешного сохранения в файл (`lastSavedState`), используется «♻️ Восстановить» (`restoreFromBackup`).
- `exportData()` скачивает `tag-tree.json`; `exportMd`/`exportTxt` — `заметки.md`/`заметки.txt` (текст собирают чистые `exportMdText`/`exportTxtText`, включая строку «Оценка: ★★★★☆» у оценённых); `exportFound()` — только текущий фильтр/папку; `notesInFolder(path)` — заметки конкретной ветки (для экспорта/печати папки из контекстного меню, без учёта глобального поиска); `printNotes` — печать/PDF через `#printArea` и `window.print()` (без библиотек), тоже со строкой `.print-rating` у оценённых.
- Импорт (`#fileInput`): размер до 50 МБ → разбор через общий `parseImportJson` (JSON; если это не JSON — Markdown/TXT через `parseMarkdownImport`: заголовки `# …`, строка тэгов `#a #b`, `Оценка: ★★★☆☆`, заголовки внутри блоков кода не считаются разделителями) → `validateImport` (структура заметок и таблицы тэгов, до 50 000 заметок; причина отказа переводится `importFailMessage`) → диалог с выбором «Заменить» / «🔗 Объединить» (`dialogShow` с `okLabel`/`extraLabel`, возвращает `true`/`'extra'`/`false`) → `prepareUndo('импорт')`; массив `views` из файла сохраняется через `saveViews()`. «Заменить»: `state.notes = applyData(data)`; «Объединить»: `mergeImportedData(data)` — `applyData`, слияние таблиц тэгов через `mergeTagTables`, затем Map по id, совпадающие заметки заменяются только если версия из файла новее (`updated`), новые добавляются; возвращает `{ added, updated, conflicts, total }` (`conflicts` — 0 при обычном импорте). Далее `resetNavigation()` → `saveState()` → `saveToFile()` → `renderAll()` → `renderViews()`.
- `mergeTagTables(oldTags)` объединяет локальную и входящую таблицы: одинаковое имя (без учёта регистра) — один тэг с переносом цвета, одинаковый id с разными именами — локальному тэгу выдаётся новый `tagUid()`. Возвращает Map «старый id → канонический id», по нему `tagIds` локальных заметок перенаправляются до слияния заметок, поэтому объединение архивов не теряет тэги.
- `chooseFile()`: `showSaveFilePicker` → дескриптор в `fileHandle`, подтверждённая запись в IndexedDB (`persistFileHandle`), автосохранение; без API — обычный экспорт. Если база недоступна, привязка живёт только до перезапуска — об этом сообщает уведомление.
- `saveToFile()` пишет **компактный** JSON (без отступов) в привязанный файл; запоминает `lastFileWriteTs` и `lastWrittenSize` (в **байтах**, `byteLength`). Записи идут строго по очереди (`fileWriteChain`), а `payload` и снимок состояния (`cloneStateSnapshot`) готовятся **синхронно до первого `await`** — иначе два быстрых сохранения могли бы перемешать состояния, а `backup` в файле относился бы к уже изменённым данным. При `NotAllowedError`/`NotFoundError`/потере разрешения сбрасывает привязку и предлагает выбрать файл заново (только если привязка всё ещё указывает на тот же дескриптор).
- `checkFileConflict()` на `visibilitychange` **и** `focus`: если файл изменён извне (`lastModified` новее записи и размер другой) — предлагает перечитать. Повторный диалог для той же версии файла не показывается (`fileConflictSkip`), а параллельные проверки схлопываются (`fileConflictBusy`).
- `readFromFile(handle?)` читает привязанный (или явно переданный) файл через те же предохранители, что и UI-импорт: сначала проверяет `file.size <= IMPORT_MAX_BYTES` до `file.text()`, затем `parseImportJson` (`validateImport`), и только потом заменяет данные. После успешного чтения обновляет `lastFileWriteTs`/`lastWrittenSize`/`fileConflictSkip`, чтобы ближайший `focus` не спросил о «внешнем изменении» того же файла.
- Привязка файла восстанавливается через IndexedDB (`restoreFileHandle`). Все операции с дескриптором идут через `openFileHandleDb()` + `fileHandleTx()`: объектное хранилище `handles` создаётся в `onupgradeneeded`, поэтому даже удаление до первой записи не оставляет базу без store. `persistFileHandle`/`loadStoredFileHandle`/`destroyFileHandle` — async и дожидаются завершения транзакции; `chooseFile()` не удаляет прошлый дескриптор перед записью нового (`put` перезаписывает). Без IndexedDB привязка живёт только на сессию.
- Диагностика без консоли: «ℹ️» → `storageProbe()`/`showDiagnostics()` (режим открытия, доступность localStorage, режим IndexedDB и квота браузера, постоянное хранилище, число заметок, backup, несохранённые ключи, факт восстановления из резерва, привязанный файл, размеры по ключам, число черновиков и последние ошибки сеанса из `runtimeErrors`).

## Тема, уведомления, мобильное, клавиши

- Тема: `data-theme` на `<html>`, фактические значения `light`/`dark`. Кнопка `#themeBtn` переключает **три состояния** по кругу: светлая → тёмная → **авто** (`state.theme = 'auto'`). `effectiveTheme()` при авто берёт системную тему (`matchMedia('(prefers-color-scheme: dark)')`), `applyTheme()` выставляет `data-theme` и иконку (🌙/☀️/🌗), а `toggleTheme()` сохраняет выбор в `noteTreeTheme`. `initThemeMedia()` лениво создаёт `themeMedia` до первого вычисления темы и подписывается на `change`, поэтому в авто-режиме интерфейс перекрашивается без перезагрузки.
- **Контраст тэгов**: цвет текста на цветной плашке выбирает `tagTextColor(background)` — парсит hex/rgb/hsl/имена (`colorToRgb`), считает относительную яркость WCAG (`relativeLuminance`) и берёт более контрастный вариант (`#111827` или `#fff`). Белый текст на светлых цветах больше не теряется.
- **Доступность результатов**: живой регион `#liveStatus` (`role="status"`, `aria-live="polite"`, визуально скрыт классом `.sr-only`) обновляется в `renderBreadcrumbs()` тем же текстом, что и счётчик, и объявляет новое число результатов при поиске/смене папки — только при изменении.
- **Возврат фокуса**: после удаления заметки `deleteNote`/`bulkDelete` через `neighborNoteId()` запоминают соседнюю карточку (следующую, затем предыдущую) и `focusNoteOrFallback()` ставит на неё фокус; если список опустел — на `#newNoteBtn` или в поиск. Клавиатурный пользователь не попадает в начало страницы.
- Оформление: единый фокус `:focus-visible` (мышью рамка не появляется), тонкие полосы прокрутки в обеих темах, анимации модалок и подсветка наведения; при `prefers-reduced-motion` анимации отключены.
- Уведомления: `notify(message)`, 2600 мс, `#toast`. **Не переименовывать в `toast`** — для `<div id="toast">` браузер создаёт глобальную `window.toast`, которая затеняет функцию.
- Мобильное (≤720px): бургер, выезжающий сайдбар `.open`, закрытие по клику вне, по выбору папки/заметки и свайпом влево (>60px); модалки прижаты к низу; сетка карточек в 1 колонку. Редактор занимает весь контент, его шапка и футер закреплены, а прокручивается только `.ne-scroll`.
  - Шапка переносится (`flex-wrap`), на ≤420px у «Файл/Экспорт/Импорт» скрываются подписи (`.btn-label`) — на 320px получается 2 ряда вместо 3. Кнопки шапки ≥36px.
  - Поля ввода на мобильных — 16px, иначе iOS Safari зумит страницу при фокусе; тач-цели строк дерева, меню, палитры и футеров — 38–40px.
  - Тулбар Markdown на мобильных не переносится, а прокручивается по горизонтали (`.md-toolbar`), экономя высоту редактора.
  - Учтены `env(safe-area-inset-*)`, `max-height` модалок в `dvh`, `interactive-widget=resizes-content` во viewport: клавиатура не прячет футер редактора.
  - «Удалить / Отмена / Сохранить» на ≤400px ужимаются по горизонтали, чтобы не вылезать за пределы панели редактора.
- Горячие клавиши: `Ctrl/Cmd+N` — новая заметка (не в полях ввода; открытие поверх несохранённых правок спрашивает подтверждение), `Ctrl/Cmd+K` — быстрый переход (палитра; `Ctrl/Cmd+P` — алиас), `Ctrl/Cmd+S` — сохранить заметку из редактора (вне редактора — сохранить данные), `Ctrl/Cmd+Enter` — сохранить заметку из редактора, `Ctrl/Cmd+B`/`Ctrl/Cmd+I` — жирный/курсив в теле, `Ctrl/Cmd+Shift+K` — ссылка в теле, `Tab`/`Shift+Tab` — отступ в теле, `Enter` — продолжение списка, `/` — фокус в поиск, `?` — справка (`showHelp`), `Ctrl/Cmd+Z` — отмена опасного действия (до 20 шагов), `Ctrl/Cmd+Shift+Z`/`Ctrl/Cmd+Y` — повтор, `Ctrl/Cmd+H` — поиск/замена в редакторе, `Esc` — закрыть редактор/просмотр заметки/палитру/подсказки или очистить поиск, `↑/↓/Enter/→/←` — навигация по дереву, карточкам, палитре и автодополнению, `1–5`/`0` — оценка карточки в фокусе. Модалки удерживают Tab (`trapModalFocus`) и возвращают фокус на элемент, с которого открылись (`rememberModalFocus`/`restoreModalFocus`).
- Контекстное меню (`#ctxMenu`): на папке — создать заметку, переименовать/удалить тэг, цвет, экспорт папки (MD/TXT), печать, открыть; на заметке — редактировать, дублировать, **копировать `[[ссылку]]`** (`copyWikiLink`), **копировать текст** (`copyNoteText`, заголовок и тело), переместить, закрепить, история, экспорт, печать, удалить. Копирование идёт через Clipboard API, а при его недоступности — через скрытую textarea и `execCommand`. Позиционируется с учётом границ экрана; подменю использует последнюю позицию (`lastCtxPos`), а не угол (0,0). Пункты меню запускаются через `runItem()` с перехватом async-ошибок.
- Диалоги вместо `prompt`/`confirm`: `dialogShow/dialogConfirm/dialogPrompt` (Promise), `#dialogMask`. Браузерные `prompt`/`confirm`/`alert` в проекте не используются.

## Безопасность (обязательно)

- **Анти-XSS:** любой пользовательский текст (заголовки, тело, тэги, имена папок, даже сообщения `renderFatal`) вставляется через `textContent`. `innerHTML` допустим только для собственных шаблонов без пользовательских данных (или после `escapeHtml`/`renderMarkdown`).
- `renderMarkdown` полностью экранирует HTML и разрешает только безопасные схемы ссылок.
- Подсветка поиска (`highlightElement`) работает по текстовым узлам и пропускает `MARK`/`CODE`/`PRE`, чтобы не ломать атрибуты и разметку.
- `renderFatal` + `window.onerror` + `try/catch` вокруг инициализации: при ошибке пользователь видит сообщение, а не пустую страницу. `unhandledrejection` перехватывается отдельно: сообщение уходит в тост, а последние 10 ошибок хранятся в `runtimeErrors` и показываются в диагностике.

## Тестирование

Запуск из корня репозитория:

```
node tests/run_test.js tests/note_tree.test.js
```

или `cd tests && npm test`. Сейчас: **207 тестов, все проходят**.

- `tests/run_test.js` загружает `tag-tree.html` в jsdom (инлайновый `<script>` выполняется целиком) и выставляет глобальные `describe/test/it/beforeEach/afterEach`, `assert` (Node `assert`, **не** strict), `app` (= `window.__app`), `resetApp()`, `window`, `document`.
- `beforeEach`/`afterEach` на верхнем уровне — глобальные (для всех тестов), внутри `describe` — локальные. В тестах зарегистрирован `beforeEach(resetApp)`.
- `resetApp()` чистит `localStorage`, `memStore` (`storageClearMemory`), убирает `indexedDB`, обнуляет данные и вызывает `resetNavigation()` — сбрасывает путь, поиск, `viewingId`/`selectedId` и состояние редактора, поэтому тесты не влияют друг на друга.
- **Подводный камень:** `applyData(data)` только **возвращает** заметки и не присваивает `state.notes`. Нужно `state.notes = applyData(...)`.
- **Подводный камень:** массивы/объекты из jsdom-реалма имеют другой прототип, поэтому `assert.deepStrictEqual` на них падает. Для массивов/объектов — `assert.deepEqual`; `strictEqual` — для примитивов.
- jsdom установлен один раз в `tests/node_modules`; не переустанавливать и не удалять.
- Тесты опираются на `window.__app` — при переименовании/переносе функций синхронизируйте список экспорта.

Что покрыто: дерево по перестановкам и счётчики, корневые заметки, `noteBelongsToPath`, `MAX_PERM_TAGS`; миграция старого формата, дедупликация тэгов и перенаправление ссылок, отбрасывание пустых, `isValidData`; разбор запроса (`#тэг`, `-тэг`, `title:`, `since/until` с пробелом, `created:`, ИЛИ через `|`), `matchesSearch`; Markdown (списки/чекбоксы, таблицы внутри кода, обёртка таблиц для прокрутки, пустые строки-разделители абзацев, XSS, схемы ссылок); превью карточек без таблиц; подсветка поиска; `restoreLastView` (многосегментный путь); `moveNoteToTag`, `cycleFacet`, `renameTag`; корзина/undo, меню «Версии данных» (открытие и переключение); `byteLength`; доступность фасетов; интеграция редактора (`openEditor`, `saveNote`, рендер с подсветкой); **редактор в правой панели** — список остаётся, индикатор несохранённых правок, возврат к просмотру после отмены/сохранения, подтверждение при уходе в папку и поиск, Esc, переименование тэга не воскрешает старое имя; делегирование событий карточек и дерева, инкрементальное дерево (тот же DOM при клике, кэш детей), стартовое сворачивание дерева и сохранённая свёрнутость, `renderAll({ tree:false })`, инвалидация кэшей (`tagsLowerOf`, термы подсветки), `saveLastView` без лишних записей (с явным `flushDeferredSettings`), отложенный предпросмотр; слой хранения — `storageInit` без IndexedDB, миграция localStorage→IndexedDB, отсутствие тяжёлых ключей в localStorage, `loadState` из базы, снимки/корзина в базе, `storageProbe` с `idbMode`, устойчивость к сбою записи при миграции; **надёжность записи** — восстановление из backup и из снимка при повреждённом JSON, отсутствие ложного «восстановлено» на целых данных, кэш снимков и корзины, повтор записи после временного сбоя базы, освобождение места (`relieveQuota`), `withTimeout` для зависшей инициализации, отсутствие аварийного экрана при старте; просмотр заметки — полный текст без обрезки, закреплённая шапка с кнопками, Markdown и XSS, цвет тэга из таблицы, двойной клик/кнопка открывают редактор, закрытие кнопкой и Esc, обновление после сохранения, закрытие при удалении/смене папки/тэге/поиске/`resetNavigation`, `renderAll({ noteView: false })` не трогает панель, неизвестный id, фиксация/сброс ширины списка при открытии/закрытии, сохранение DOM списка; поиск — область «В папке» ограничивает выдачу, недоступность области в корне, путь и кнопка «в дереве» в результатах; быстрый переход `Ctrl+K` — открытие, группировка, префикс `@`, переход к тэгу; **новая заметка и рейтинг** — новая заметка в папке создаётся без тэгов, звёзды в редакторе/карточке/просмотре, сброс повторным кликом, нормализация 0–5, копирование при дублировании, пустые кликабельные звёзды без оценки, постановка и сброс оценки прямо с карточки без открытия просмотра/редактора, синхронизация с открытым редактором, перестроение при сортировке по оценке; сортировка по оценке и tiebreak по `updated`; экспорт MD/TXT и печать со строкой оценки; ручной снимок (в том числе без изменения состава и на пустом архиве); клавиатурная навигация палитры, автодополнения тэгов и подсказок поиска; переход по тэгу раскрывает свёрнутую ветку и спрашивает подтверждение при несохранённых правках; **задачи, фасеты и представления** — клик и Space переключают задачу в просмотре с записью в историю, чип оценки в фасетах включает/снимает `rating:`, `pinned:true/false` фильтрует закреплённые, представление восстанавливает запрос + сортировку + область, старый строковый формат представления продолжает работать; **поиск и меню оценки** — `rating:` с операторами и `none`, клавиши `1–5`/`0` на карточке, подменю «★ Оценка», Markdown в печати, `updated` не меняется от одной оценки; **внутренние ссылки** — `[[…]]` рендерится в безопасную ссылку и не пропускает HTML, `noteBacklinks` находит источники без учёта регистра, клик по ссылке и по обратной ссылке открывает заметку в её папке; **многоуровневая отмена** — несколько undo подряд, redo, очистка повтора новым действием и `clearUndoHistory`; **порционная отрисовка** — 200 карточек, «Показать ещё», автоподгрузка (`loadMoreNotes`), сброс порции при смене поиска; **P1/P2** — merge-импорт по id и `updated`, массовое выделение и операции, diff-превью истории/снимков (`textDiffPreview`/`dataDiffSummary`), `created:` и ИЛИ, черновики по заметкам (включая старый формат), ARIA-атрибуты дерева; **кэши P0** — поисковый текст не устаревает после переключения задачи, индекс `noteById` обновляется после удаления, обратные ссылки пересчитываются при изменении данных, сниппет сдвигается к найденному, отложенная запись оценки сбрасывается через `flushStateSave`; **P3** — `notesForPath` по индексу дерева, догрузка без пересборки уже показанных карточек, `Ctrl+S` в редакторе, справка по `?` с возвратом фокуса, журнал `unhandledrejection`, лимит размера черновиков и перенос `noteTreeDraft` в `HEAVY_KEYS`, прореживание автоснимков, импорт Markdown (заголовки/тэги/оценка, код-фенсы), экспорт представлений в `serializeData`, «Выбрать все» в массовых операциях; **ленивое хранение** — `storageInit` не читает снимки/корзину, их поднимают `ensure*Loaded`, снимок и удаление до загрузки не затирают старую историю (буферы сливаются), восстановление из снимка при повреждённых данных ждёт ленивое чтение из базы; **ревизии и вкладки** — `saveState` растит `rev` и пишет `updatedAt`, `loadState` читает ревизию конверта, устаревшая копия не пишет без выбора (диалог «Перечитать / Объединить / Перезаписать»), объединение сохраняет заметки обеих вкладок; **виртуализация** — расчёт колонок под CSS-сетку, раскладка по рядам, `virtualRange` с запасом, большой список рисуется окном (в DOM единицы карточек), прокрутка сдвигает окно; **конфликты и черновики** — объединение с `preserveConflicts` сохраняет обе версии заметки и помечает проигравшую копией, одинаковые версии копий не создают, обычный импорт копий не плодит, менеджер черновиков показывает и открывает несохранённый текст, черновик удалённой заметки открывается как новая; группировка заметок с одинаковым набором из 5 тэгов сохраняет все пути и не даёт дублей; превью карточки обновляется после изменения текста; **UX редактора** — Enter продолжает маркированный/нумерованный/задачный список и выходит из пустого пункта, Tab/Shift+Tab меняют отступ, Ctrl+B оборачивает выделение; быстрые фильтры `pinned:`/`task:`/`links:` включаются и снимаются, `joinQueryTokens` сохраняет кавычки у тэгов с пробелами; представление обновляется текущим фильтром и переименовывается; копирование `[[ссылки]]` и текста заметки; **доступность и тема** — контрастный цвет текста на плашках (белый/тёмный по яркости, hex/rgb/hsl/имена), `aria-live`-объявление числа результатов, переключение темы по кругу светлая → тёмная → авто с сохранением выбора и следованием `prefers-color-scheme` (включая смену системной темы без перезагрузки), возврат фокуса на соседнюю карточку после удаления; **исправления review** — объединение таблиц тэгов при импорте (непересекающиеся тэги, одинаковое имя с разными id и перенос цвета, одинаковый id с разными именами), дескриптор файла в IndexedDB (persist/load/delete, создание store при первом открытии, устойчивость к недоступной базе) и единые предохранители импорта (`parseImportJson`, `importFailMessage`, отказ `readFromFile` для файла >50 МБ, битого JSON и неверной структуры, успешная загрузка валидного архива).

## Правила при правках

- Не добавлять внешние ресурсы и сборку; приложение остаётся одним файлом.
- Не переименовывать `notify()` в `toast`.
- Держать `window.__app` в синхроне с кодом.
- Использовать `storageGet/storageSet`, а не `localStorage` напрямую.
- Новый тяжёлый ключ (заметки, снимки, корзина и т.п.) добавлять в `HEAVY_KEYS`; настройки оставлять в `localStorage`. Если ключ не нужен на первом экране — добавьте его ещё и в `LAZY_KEYS` и читайте через `readLazyKey()`/`ensure*Loaded()`, а не в `storageInit()`.
- Не читать IndexedDB в обход `storageGet`/`storageInit`: синхронные вызовы должны видеть `memStore`. Ленивое чтение — только через `readLazyKey()`; новые записи до завершения такого чтения буферизуйте и сливайте в `*Finish()`, иначе прочитанная история затрётся.
- `storageInit()` должен завершиться до `loadState()` (см. `startApp`); `startApp` и `reloadFromStorage` — async и **ждут** `loadState()`, потому что восстановление из снимка может потребовать ленивого чтения.
- `saveState()` может вернуть `false` при конфликте вкладок — это не ошибка, а сигнал «запись отложена до ответа пользователя». Не вызывайте `writeStateEnvelope()` в обход проверки `staleData` (кроме самого разрешения конфликта) и не игнорируйте `staleData` в `saveToFile()`.
- Кэши хранения (`snapshotCache`, `trashCache`, `snapshotSigCache`, флаги `snapshotsLoaded`/`trashLoaded`, буферы `pending*`, `dataRev`/`knownRev`/`staleData`) сбрасывать в `storageClearMemory`; новые кэши снимков/корзины/ревизий добавлять туда же, иначе тесты и импорт увидят старые данные.
- Кэши рендера поиска (`searchTextCache`, `tagsLowerCache`, `backlinkIndexCache`, `noteIndexCache`, `previewTextCache`) сбрасывать в `invalidateTree()`; при точечном изменении текста (задачи в просмотре) достаточно `invalidateNoteCaches(n)`.
- Частые действия с оценкой/задачами сохранять через `deferStateSave()` (при необходимости `deferredFileSave = true`), а очередь сбрасывать в `flushStateSave()` на `pagehide`/`visibilitychange` и в `storageClearMemory()`.
- `applyTreeState()` обновляет только активную строку; если действие меняет свёрнутость или цвет, выставляйте `treeStateDirty = true` до рендера, иначе шевроны/цвета останутся старыми.
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
- Рейтинг — целое 0–5: нормализовать только `clampRating()`, звёзды строить через `starsHtml()`, текст для экспорта — через `ratingText()`; не выводить рейтинг в HTML, минуя эти функции.
- Оценку с карточки ставить только через `rateNoteFromCard()`: она сохраняет прокрутку (не пересобирает список), синхронизирует открытый редактор и не открывает просмотр. Из меню и клавиатуры — через `setNoteRating()` (без toggle, если повторный выбор не должен сбрасывать).
- Клик по задаче в просмотре — только через `toggleNoteTask()` (она пишет историю, сохраняет данные и обновляет карточки без потери прокрутки), а не прямой правкой `body` из обработчика.
- Новые фильтры поиска добавлять в `parseQuery` + `matchesSearch` (и в счётчик фасетов), не дублируя разбор в рендере.
- Внутренние ссылки `[[…]]` обрабатывать только в `renderMarkdown` (через плейсхолдеры, чтобы не трогать код) и переходить по ним только через `openWikiLink()`; это сохраняет подтверждение ухода из редактора.
- `notesRenderLimit`/`notesRenderKey`/`notesCurrentList` — состояние порционной отрисовки; при полной замене данных и в навигации его сбрасывает `resetNotesRenderChunk()` (внутри `resetNavigation`), он же выключает виртуализацию. Новые способы подгрузки (прокрутка, клавиатура, кнопка) должны идти через `loadMoreNotes()`/`appendMoreNotes()` и `notesCurrentList`, а не менять лимит вручную и не вызывать полный `renderNotes()`.
- Виртуализация: при `virtualActive` нельзя искать карточку через `querySelectorAll('#notes .note-card')` — нужной карточки может не быть в DOM. Используйте `findNoteCard()`/`virtualEnsureVisible()`, переходы по индексам `notesCurrentList`, а после смены ширины или открытия правой панели — `refreshVirtualLayout()`. Новые элементы внутри `#notes` (кнопки, разделители) должны учитывать, что контейнер может быть `.virtual` с рядами и распорками.
- `virtualActive` включается только при `notes.length > VIRTUAL_THRESHOLD` и `clientHeight > 0`. Тесты, которым нужна виртуализация, подменяют `clientHeight`/`clientWidth` через `Object.defineProperty` и сбрасывают состояние `resetNotesRenderChunk()`; обычные тесты в jsdom работают на порционной отрисовке.
- Списки заметок папки/области поиска строить через `notesForPath()` (готовые `node.ids` из `buildTree()`), а не перебором всего архива. `notesInPath()` и `searchScopeNotes()` — тонкие обёртки, сохраняйте это.
- Массовые операции — только через `bulk*`/`bulkReady()`: редактор должен быть закрыт, иначе сохранение из него перезапишет изменения. Выделение сбрасывается при смене контекста (`renderKey`), в `resetNavigation()` и после каждой операции.
- Черновики редактора хранятся по ключу заметки (`draftKeyFor(id)`, `'__new__'` для новой): `readStoredDraft(key)`/`clearStoredDraft(key)`. При удалении заметки передавайте её id, иначе очистится чужой/новый черновик; `writeDraftStore()` сам чистит удалённые и устаревшие записи.
- Diff-превью — только через `textDiffPreview()` (история заметки) и `dataDiffSummary()` (снимки/резерв): они не меняют данные и не должны использоваться для восстановления без подтверждения.
- Импорт с объединением — только через `mergeImportedData()` (таблицы тэгов сливает `mergeTagTables`, заметки дедуплицируются по id, побеждает более новый `updated`); не смешивать его с прямой заменой `state.notes`. Конфликтные копии создаёт только режим `{ preserveConflicts: true }` (разрешение конфликта вкладок), обычный импорт копий не плодит.
- Чтение привязанного файла и UI-импорт обязаны идти через одни предохранители: размер ≤ `IMPORT_MAX_BYTES` до чтения текста и `parseImportJson` (`validateImport`) до замены данных. Не вызывать `JSON.parse`/`applyData` для внешнего файла напрямую в обход этих проверок.
- ARIA дерева (`role`, `aria-level`, `aria-expanded`, `aria-selected`) обновлять в `updateRowState`/`updateRowVisual`/`applyTreeState` вместе с классами, иначе состояние для скринридеров разъедется с визуальным.
- Соблюдать анти-XSS-правила и стиль секций `// ---------- Имя ----------`.
- Не ломать обратную совместимость: старый формат `tags: ['имя']` должен продолжать импортироваться.

## Порядок воссоздания (если понадобится переписать с нуля)

1. Разметка: шапка (файл/версии/диагностика/тэги/экспорт/импорт/тема/+заметка), сайдбар (поиск + сортировка + фасеты + дерево), контент (крошки + список + просмотр заметки + редактор справа), менеджер тэгов, палитра, универсальный диалог, `#toast`, скрытые `#fileInput` и `#printArea`.
2. CSS-переменные светлой/тёмной темы + адаптив ≤720px.
3. Модель: `normalizeNote`, `isEmptyNote`, `uid`, `clampRating`, таблица тэгов и `rebuildTagIndex`.
4. Хранилище: `storageGet/storageSet` + `memStore`, `HEAVY_KEYS`/`LAZY_KEYS`/`EAGER_HEAVY_KEYS`, `storageInit` (поднимает только срочные ключи до `loadState`, таймаут), `openIdb/idbGetAll/idbPut`, `queueIdbWrite/flushIdbWrites/idbIdle` с повторами, `readLazyKey` + `ensureSnapshotsLoaded/ensureTrashLoaded` с буферами `pending*`, `relieveQuota`, `migrateLsToIdb`, кэши снимков/корзины, ключи, `loadState/saveState/writeStateEnvelope/saveTheme/saveCollapsed`, ревизии `dataRev/knownRev/staleData` и отложенная запись настроек.
5. Ядро тэгов: `tagsOf`, `permute`, `notePaths`, `noteBelongsToPath`, `buildTree` + кэш и `MAX_PERM_TAGS`.
6. Рендер: `renderTree/renderNode`, `renderBreadcrumbs`, `renderNotes`, `renderAll`, `matchesSearch`/`notesInPath`, порционная отрисовка и `virtualColumnsFor/virtualChunk/virtualOffsets/virtualRange/renderVirtualNotes/renderVirtualWindow`.
7. Просмотр заметки: `.content-split` + `#noteView`, `openNoteView/closeNoteView/renderNoteView`, `goToPath`.
8. Редактор в правой панели: `openEditor/openEditorPanel/closeEditor`, `guardUnsavedEditor`, `saveNote/deleteNote` + ввод тэгов (бейджи, подсказки, автодополнение).
9. Поиск `onSearch`, разбор запроса, фасеты, представления, подсказки.
10. Тема `toggleTheme/applyTheme`, уведомления `notify`.
11. Экспорт/импорт `serializeData/exportData/importData`, экспорт MD/TXT, печать.
12. File System Access API: `chooseFile/saveToFile/readFromFile/restoreFileHandle`, обработка отсоединения и конфликтов.
13. Надёжность: корзина, отмена, версионные снимки (ленивое чтение), история заметки, `saveLastView/restoreLastView`, ревизии и разрешение конфликтов вкладок.
14. Мобильное: `toggleSidebar/closeSidebar/toggleSidebarIfMobile`, свайп, адаптив.
15. Горячие клавиши, контекстные меню, командная палитра, диалоги.
16. Обработка ошибок: `renderFatal` + `try/catch` инициализации + `window.onerror`.
17. Тест-хук `window.__app` и тесты в `tests/`.

## Известные ограничения

- Если недоступны и IndexedDB, и `localStorage`, данные живут только в памяти и теряются при перезагрузке — приложение предупреждает, доступны экспорт и файловое хранение. Если работает только база, то заметки сохраняются, а настройки (тема, свёрнутые папки, сортировка) — нет.
- На `file://` хранилище привязано к **папке** с HTML, а не к файлу: перенос HTML в другую папку или смена профиля браузера = «нет данных». OPFS на `file://` заблокирован (`SecurityError`), поэтому используется IndexedDB; перенос между машинами — только экспорт JSON или привязанный файл.
- Привязка локального файла не гарантируется после перезагрузки вкладки (зависит от поддержки IndexedDB и разрешений).
- Если у заметки больше 5 тэгов, в дереве/навигации участвуют только первые 5.
- История заметки — 20 снимков, корзина — 20, версионные снимки — 5; отмена — до 20 действий.
- Версионные снимки фиксируют изменение **состава** заметок, а не каждое редактирование текста (для текста есть `history` заметки).
- Большие списки (больше 400 заметок) рисуются виртуальным окном: в DOM живут только видимые ряды плюс запас, высота остатка заменена распорками. Высоты измеряются по факту, поэтому при очень разной высоте карточек возможны небольшие подстройки прокрутки. На меньших списках работает порционная отрисовка по 200 карточек; это не виртуализация — после автоподгрузки карточки остаются в DOM.
- Конфликт вкладок разрешается только при попытке записи. Если вкладка не сохраняет данные, она не узнает о чужих изменениях до следующего `saveState()`; «Объединить» сопоставляет заметки по id и не сливает текст внутри одной заметки (побеждает более новый `updated`).
- Снимки и корзина после старта могут быть ещё не прочитаны: меню версий и диагностика ждут загрузку, а восстановление из корзины до её готовности попросит открыть меню ещё раз.
- Черновиков редактора — до 20 (по одному на заметку плюс новая), старше 30 дней и для удалённых заметок они вычищаются при записи.
