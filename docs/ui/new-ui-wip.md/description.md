# Proposed UI Direction: **Warm Human Interface, Verifiable Core**

The new interface should operate in three layers:

1. **Human layer** — what Open Care does and why it matters.
2. **Funding layer** — what happened to the shared fund.
3. **Proof layer** — hashes, transactions, anchors, payloads, and exports.

Most visitors should understand the product through the first two layers. Technical proof remains one click away rather than dominating every screen.

---

## One important data-visualization rule

The funding tree must not imply a relationship the backend does not actually store.

Unless the system records explicit allocation edges, the UI should **not** visually claim:

> Donation A directly paid for receipt B.

Instead, the graph should communicate:

```text
Donations → Shared fund → Therapy purchases
                     ↘ Public ledger checkpoints
```

Donations enter a pooled balance. Disbursements leave that balance. Anchors verify the ledger’s recorded history. A receipt reference supports a disbursement claim, but the blockchain does not independently prove that the receipt is authentic.

This distinction should influence the graph structure:

- Donations branch **into** the central fund.
- Disbursements branch **out of** the central fund.
- Receipt proof belongs to a disbursement.
- Anchors attach to ledger checkpoints.
- Corrections attach to the events they supersede.
- No arbitrary donation-to-recipient line is drawn.

That will make the design both visually strong and technically honest.

---

# 1. New Global Layout

## Public header

Reduce the six visible links to four primary destinations:

```text
Open Care     История     Проверить     О проекте     [Помочь]
```

`Вопросы`, `Контакты`, GitHub, API export, and the deployment version move to the footer.

### Header behavior

- Transparent or cream background over the landing hero.
- Becomes a compact blurred/sticky bar after scrolling.
- `Помочь` is always the visually dominant button.
- Mobile uses a simple menu drawer.
- Devnet displays a persistent but unobtrusive amber environment badge.

## Footer

A substantial but quiet footer:

- Short Open Care description
- История
- Проверить
- Вопросы
- Контакты
- GitHub
- Privacy/trust note
- Deployment version

Suggested footer statement:

> Публичные деньги. Приватные получатели.

---

# 2. Visual Language

## Tone

The visual identity should feel:

- caring, not sentimental;
- transparent, not corporate;
- technical, not “crypto-bro”;
- organic, but not decorative everywhere.

The botanical illustration belongs mainly on the landing page and selected empty states. Data-heavy pages should use the same palette but remain restrained.

## Proposed palette

| Role            | Direction                |
| --------------- | ------------------------ |
| Page background | warm cream               |
| Main surfaces   | near-white ivory         |
| Primary text    | deep forest green        |
| Secondary text  | warm gray-brown          |
| Donation        | natural green            |
| Disbursement    | warm terracotta or amber |
| Anchor          | calm muted blue          |
| Correction      | muted lavender           |
| Success         | sage green               |
| Warning         | pale ochre               |
| Error           | restrained brick red     |

The existing event colors already fit this direction and only need refinement.

## Typography

Use an open-source editorial serif for major headings and Inter for application UI.

```text
Display headings: Newsreader / Georgia fallback
Interface and body: Inter
Hashes and payloads: monospace
```

The serif gives the landing page warmth. The interface remains highly readable because all controls, labels, numbers, and proof data stay sans-serif.

## Shape and depth

- Cards: 16–24px radius
- Primary hero panel: 24–30px radius
- Buttons: moderately rounded, not every control fully pill-shaped
- Shadows: very soft and low contrast
- Borders: warm gray, more important than shadows
- Technical panels: slightly tighter radius and spacing
- Hash values: inset neutral surface

---

# 3. Landing Page

## Purpose

Explain the project immediately and make the live funding component feel like the product itself—not an illustrative dashboard placed beside the product.

## Desktop composition

Use the merged mockup structure:

```text
┌─────────────────────┬──────────────────────────────────┐
│ Human story         │ Live vertical funding trail      │
│                     │                                  │
│ Headline            │ Current fund state               │
│ Short explanation   │ Scrollable event network         │
│ CTAs                 │ Selected-event inspector         │
│ Trust statement     │                                  │
└─────────────────────┴──────────────────────────────────┘
```

Approximately 35% / 65%.

## Left hero

### Suggested copy

**Kicker**

> Прозрачное финансирование терапии

**Headline**

> Помощь, которую можно проверить.

Alternative with more personality:

> Реальная помощь. Радикальная прозрачность.

**Lead**

> Пожертвования поступают в общий фонд, из которого оплачивается психологическая помощь. Публичные события можно проверить, а данные получателей не раскрываются.

**Actions**

- `Помочь`
- `Открыть историю`

**Trust line**

> Публичные средства. Приватная помощь.

The copy should remain short. Longer explanations belong below the fold or on the About page.

## Compact metrics

Replace three large cards with a small horizontal strip:

```text
В фонде             Оплачено               Последнее закрепление
1 240 USDC           18 выплат              2 часа назад
```

The values can display skeleton placeholders while loading.

## Live funding trail

### Panel header

```text
Путь средств                         Обновлено 4 сек назад
Последние публичные события          [Поиск] [Открыть полностью]
```

Do not label it “live” unless the client is genuinely refreshing. A polling implementation can still say:

> Обновлено 4 сек назад

If data becomes stale:

> Нет обновлений 2 минуты

### Vertical graph structure

The graph begins with a sticky current-state block:

```text
Сейчас
Баланс 1 240 USDC · HEAD #1842 · закреплён до #1839
```

Below it, the trail descends into earlier history.

#### Donations

Appear as compact green cards branching into the central fund line:

```text
Пожертвование
+150 USDC
7xq9…6kL2 · 2 мин
```

#### Disbursements

Appear on the opposite side of the central line:

```text
Оплачены сессии
−250 USDC · Alter ×5
1 мин
```

The technical badge can still say `Выплата`.

#### Receipt proof

A smaller child node under its disbursement:

```text
Подтверждение покупки
ALTER-2026-06-14-A1B2C3
```

#### Anchor checkpoint

A blue checkpoint that crosses or attaches directly to the central spine:

```text
История закреплена в Solana
HEAD #1839
```

#### Correction

A lavender side branch linked visually to the affected event:

```text
Коррекция #1841
Заменено поле receipt_ref
```

### Selection behavior

Clicking or focusing a node:

- highlights the selected node;
- dims unrelated branches slightly;
- emphasizes its path to the ledger checkpoint;
- opens a compact inspector over the right side of the panel.

The landing inspector should show only:

- event summary;
- amount;
- timestamp;
- event hash;
- verification status;
- `Открыть полную запись`.

It should not expose a huge JSON payload on the landing page.

### Scroll behavior

- The graph scrolls vertically inside its card.
- The current-state header remains sticky.
- A slim minimap is optional on desktop.
- New events appear at the top with a subtle insertion animation.
- Scroll position should not jump while the visitor is inspecting older data.

## Below the hero

Keep the rest of the landing concise.

### Section 1 — How it works

Three visual steps:

```text
1. Пожертвование поступает в общий фонд
2. Из фонда оплачивается психологическая помощь
3. Событие добавляется в реестр и закрепляется в Solana
```

### Section 2 — What is public and private

A two-column card:

| Public             | Private           |
| ------------------ | ----------------- |
| суммы и транзакции | имена получателей |
| выплаты            | Telegram-маршруты |
| ссылки на чеки     | коды сертификатов |
| хеши и якоря       | личные сообщения  |

### Section 3 — Honest limitation

A small trust statement:

> Закрепление в Solana подтверждает историю реестра, но не заменяет независимую проверку подлинности чека.

### Final CTA

> Помочь оплатить следующую сессию
> `[Помочь с помощью USDC]`

---

# 4. Full Funding Explorer — `/ledger`

This becomes the flagship application screen.

## Page header

Use a modest page title rather than another enormous marketing headline.

```text
Публичная история
Все поступления, оплаты и проверки фонда.
```

## Summary strip

At the top:

```text
Получено       Оплачено       В фонде       Событий       Последний якорь
12 460 USDC    9 220 USDC     3 240 USDC    1842          2 ч назад
```

## Main layout

```text
┌────────────────────────────────┬─────────────────────────┐
│ Search, filters, funding trail │ Sticky event inspector  │
│                                │                         │
│ Vertical scrollable network    │ Human summary           │
│                                │ Proof tabs              │
│                                │ Technical details       │
└────────────────────────────────┴─────────────────────────┘
```

About 65% / 35%.

## Explorer controls

A single compact toolbar:

- Search by event hash, transaction, or receipt reference
- Event-type filter
- Date range
- Latest/oldest sort
- Export menu

Filter labels:

```text
Все · Пожертвования · Оплаты · Закрепления · Коррекции
```

Use `Оплаты` in the public interface and retain `disbursement_recorded` internally.

## Date grouping

Instead of rendering all events as identical rows, group them by meaningful checkpoints:

```text
Сегодня
Закрепление HEAD #1839
— events after it —

14 июня
Закрепление HEAD #1812
— events after it —
```

This gives the blockchain/checkpoint feeling without copying a git interface.

## Inspector

The selected-event inspector is the heart of the page.

### Tabs

```text
Обзор | Доказательство | Чек | Приватность | Данные
```

Tabs can vary by event type.

### Overview

Human-readable summary first:

```text
Оплачены 5 сертификатов Alter
250 USDC
14 июня 2026, 12:18 UTC
```

### Proof

A compact three-step chain:

```text
Предыдущий хеш → Хеш события → Закреплённый HEAD
```

Include:

- sequence number;
- current event hash;
- previous hash;
- closest later anchor;
- Solana transaction;
- verification status.

### Receipt

For a disbursement:

- provider;
- count;
- amount;
- purchase timestamp;
- receipt reference;
- public beneficiary reference, only if relevant;
- honest note about what the reference proves.

### Privacy

A short explanation:

```text
В публичном реестре нет имени, Telegram ID или кода сертификата.
```

### Data

Pretty JSON, collapsed by default, with:

- Copy JSON
- Download event
- Raw payload

## Deep links

`/ledger/{eventHash}` should render the same inspector state as a standalone page.

On desktop, the route can open the explorer with the event already selected. On mobile or direct navigation, it becomes a full-page event view. This avoids maintaining two unrelated visual systems.

## Mobile behavior

- Funding trail fills the page.
- Inspector opens as a bottom sheet.
- Filters open in a modal sheet.
- Side branches become shorter but remain visible.
- Do not collapse the graph into a plain flat list.
- Each node remains keyboard- and touch-selectable.

---

# 5. Event Detail

Even if the event is opened outside the full explorer, the information hierarchy should remain:

## Header

```text
← Публичная история

Оплата сессий
Событие #1840
```

Status badge and date sit beside the title.

## Main content

### Human summary card

Amount, provider, count, transaction, receipt status.

### Proof chain card

```text
prev_hash → event_hash → anchor
```

### Context card

Explain what this event changed in the fund:

```text
Баланс фонда уменьшился на 250 USDC.
```

Only display this if the backend can calculate the statement accurately.

### Privacy card

Clearly state omitted data.

### Raw payload

Collapsed accordion:

> Технические данные события

This is more approachable than making a large dark JSON block one of the page’s main visual elements.

---

# 6. Donate Page

The current page contains the right information but gives every technical detail equal visual importance. The redesign should separate the essential action from advanced detail.

## Desktop layout

```text
┌───────────────────────────┬──────────────────────────────┐
│ Explanation and steps     │ Sticky payment card          │
│                           │                              │
│ Public-chain notice       │ QR                           │
│ What happens afterward    │ Address + copy               │
│ Troubleshooting           │ Network/token                │
└───────────────────────────┴──────────────────────────────┘
```

## Page heading

> Помочь оплатить терапию

Lead:

> Отправьте USDC в сети Solana. Поступление появится в публичной истории после подтверждения.

## Payment card

The card should resemble a calm payment request, not an infrastructure form.

```text
USDC · Solana

[QR]

Адрес фонда
7xQK…Y3a1                 [Скопировать]

[Открыть в Solscan]
```

Below:

```text
Сеть: Solana
Токен: SPL USDC
```

Mint address and treasury technical details move into:

> Дополнительные технические данные

## Instructions

Reduce to three steps:

1. Open a wallet that supports Solana USDC.
2. Send USDC to the displayed address.
3. Wait for the transfer to appear in the public history.

## Warning block

One concise amber card:

> Адрес отправителя и сумма будут видны в Solana. Не добавляйте имя, контактные данные или другую личную информацию в Memo.

## After sending

A useful short section:

```text
Что произойдёт дальше?

Перевод появится в истории → средства войдут в общий баланс →
оплата помощи будет записана отдельным публичным событием.
```

## Troubleshooting

Use a collapsed accordion rather than another large card stack.

---

# 7. Verify Page

The existing page is functionally thorough but visually reads like documentation. The new design should answer one question immediately:

> Is the public ledger currently verifiable?

## Top verification status

A large status card:

```text
✓ Реестр проверен

Цепочка событий пересчитана.
Последний якорь найден в Solana.
```

Then show the relationship between current and anchored state:

```text
Текущий HEAD          Закреплённый HEAD
#1842                 #1839

3 новых события ожидают следующего закрепления
```

This communicates the pre-anchor behavior much more clearly than a paragraph.

## Three verification steps

### 1. Hash chain

```text
1840 → 1841 → 1842
Цепочка непрерывна
```

### 2. Solana anchor

```text
HEAD #1839
5Hf3…nQ7z
Найден в Memo Program
```

### 3. Independent export

Actions:

- `Скачать реестр JSON`
- `Открыть транзакцию`
- `Скопировать HEAD`

## Previous anchors

A clean timeline or compact table below the status.

## Developer verification

Place the TypeScript code behind an expandable section:

> Проверить самостоятельно с помощью кода

## Troubleshooting

Another accordion:

- hash mismatch;
- anchor unavailable;
- anchor delayed;
- network request failed.

## Stale anchor

Use an amber status but avoid implying corruption:

> Последнее закрепление старше 25 часов. Цепочка реестра продолжает проверяться, но автоматическая публикация могла задержаться.

---

# 8. About, FAQ, and Contact

## About

Turn the current long static page into an editorial story.

### Structure

1. What Open Care is
2. A four-step process diagram
3. Public versus private boundaries
4. Wallet separation
5. What the system proves
6. What it does not prove
7. Current MVP limitations

The “what it does not prove” section should be visually prominent. Honest limitations strengthen the brand.

## FAQ

Use accessible accordions, grouped into:

- Пожертвования
- Реестр и проверка
- Приватность
- Работа проекта
- Проблемы и поддержка

Only one or two questions need to be expanded initially.

## Contact

A focused support screen:

```text
Сообщить о проблеме

Добавьте:
• подпись транзакции;
• хеш события;
• ссылку на страницу;
• примерное время;
• описание.

Не добавляйте:
• имена;
• Telegram ID;
• коды сертификатов;
• ключи или пароли.
```

The GitHub action becomes a large clear button, followed by the public-issue warning.

---

# 9. Error, Loading, Empty, and Stale States

These states should feel designed as part of the product rather than fallback text.

## Loading

- Funding trail renders skeleton nodes and connectors.
- Metrics preserve their exact width.
- Inspector shows a structured skeleton.
- Avoid replacing entire sections with centered `Загрузка...`.

## Error

Keep the last successfully loaded information visible when possible.

Example:

```text
Не удалось обновить историю
Показаны данные, полученные 4 минуты назад.

[Повторить]
```

Request IDs belong under an expandable `Технические детали`.

## Empty ledger

A restrained sprout/branch illustration:

> История начнётся после первого подтверждённого пожертвования.

CTA:

> Как сделать первое пожертвование

## Empty filtered result

> Событий этого типа пока нет.

Include `Сбросить фильтр`.

## Stale data

The status indicator changes from green to amber:

```text
Обновление задерживается · последние данные 3 мин назад
```

## Invalid event hash

Use the same event-detail shell with a compact error state, not a completely different page.

---

# 10. Admin UI

The admin area should share tokens and components with the public site but feel more operational and less illustrated.

No large plants, hands, or decorative hero art. Use warm surfaces, forest accents, and the same event colors.

## Admin shell

Desktop:

```text
┌──────────────┬──────────────────────────────────────────┐
│ Dashboard    │ Main workspace                           │
│ Выплаты      │                                          │
│ Якоря        │                                          │
│ Доставка     │                                          │
│              │                                          │
│ Выйти        │                                          │
└──────────────┴──────────────────────────────────────────┘
```

A compact sidebar works better than pill navigation once the workflows become denser.

Mobile can use a top selector or drawer.

## Token gate

A calm centered security card:

```text
Вход оператора

Токен хранится только в памяти этой вкладки
и будет удалён после 30 минут бездействия.

[Токен оператора                    ]
[Войти]
```

Use a shield icon and a subtle session-security note. No decorative landing-page art.

---

## Admin dashboard

### Top status bar

```text
Система работает нормально
5 из 5 проверок пройдены
```

Degraded checks appear directly beside this status rather than in a distant section.

### Metrics

- Current balance
- Total received
- Total disbursed
- Pending delivery requests
- Latest anchor age

### Primary tasks

Three action cards:

- `Записать оплату`
- `Опубликовать якорь`
- `Доставить сертификат`

Each card can show a small contextual number:

```text
Доставить сертификат
3 запроса ожидают
```

### Recent activity

Use the same compact event nodes as the public explorer, without the full graph.

---

## Disbursement recording

The current max-width 40rem form should become a two-column working screen.

```text
┌────────────────────────────┬──────────────────────────────┐
│ Form                       │ Public event preview         │
│                            │                              │
│ Amount                     │ Оплачены сессии              │
│ Count                      │ −250 USDC                    │
│ Provider                   │ Alter ×5                     │
│ Receipt                    │ receipt ref                  │
│ Public ref                 │ What will be public/private  │
│ Purchase date              │                              │
└────────────────────────────┴──────────────────────────────┘
```

### Important improvement

Before submission, show exactly what will appear publicly.

A final confirmation step should say:

> После записи событие нельзя изменить. Исправление создаст отдельное публичное событие.

Actions:

- `Назад`
- `Подтвердить и записать`

The success state remains on the same screen and presents the next task:

> Выплата записана
> Следующий шаг: доставить сертификат

---

## Anchor management

Structure the page around the next action.

### Current state

```text
Последний якорь
HEAD #1839 · 2 часа назад · подтверждён
```

### Pending difference

```text
Текущий HEAD #1842
Будут закреплены 3 новых события
```

### Action

`Опубликовать новый якорь`

The confirmation dialog shows:

- exact HEAD;
- memo;
- anchor wallet;
- estimated action;
- reminder that only a hash goes on-chain.

While running, show a progress sequence:

```text
Подготовка → Отправка → Подтверждение → Запись в реестр
```

Success and already-published states reuse the same result component.

---

## Bot certificate delivery

This should become a split-pane queue.

```text
┌────────────────────────┬─────────────────────────────────┐
│ Requests               │ Selected request                │
│                        │                                 │
│ Pending row            │ Request summary                 │
│ Pending row            │ Related disbursement            │
│ Delivered row          │ Secure code input               │
│                        │ Send action                     │
└────────────────────────┴─────────────────────────────────┘
```

### Queue row

- status;
- internal handle;
- time waiting;
- related payout status.

### Detail panel

Display only operational identifiers and clearly separate:

```text
Publicly recorded
Privately stored
Delivery secret
```

### Code field

Use a masked/revealable input with:

- explicit temporary-value warning;
- `Код будет удалён после отправки`;
- send confirmation;
- immediate clearing after success or component destruction.

---

# 11. Shared Component Architecture

The redesign should consolidate several current components.

| Current component      | New component                               |
| ---------------------- | ------------------------------------------- |
| `Timeline`             | `FundingTrail`                              |
| `TimelineRail`         | `TrailConnectorLayer`                       |
| `TimelineCard`         | `FundingEventNode`                          |
| Event detail page      | `EventInspector` in full-page mode          |
| `EventCard`            | `CompactEventRow`                           |
| `HashDisplay`          | `HashValue` with copy and expansion         |
| `SolscanLink`          | `ChainLink`                                 |
| `FilterTabs`           | `EventFilterBar`                            |
| `Pagination`           | `TrailPagination` or infinite-load sentinel |
| Admin navigation       | `AdminShell`                                |
| Repeated warnings      | `Notice` component                          |
| Repeated success cards | `ResultPanel`                               |

## Core `FundingTrail` family

```text
FundingTrail
├── TrailCurrentState
├── TrailDateGroup
├── TrailConnectorLayer
├── DonationNode
├── DisbursementNode
├── ReceiptNode
├── AnchorNode
├── CorrectionNode
├── TrailMinimap
└── EventInspector
```

The landing, ledger page, and event detail route should all use the same underlying event visualization and inspector components with different density modes:

```ts
density: 'preview' | 'explorer' | 'compact';
inspector: 'popover' | 'sidebar' | 'page' | 'sheet';
```

---

# 12. Motion and Interaction

Use motion to clarify relationships, not decorate the page.

### Appropriate motion

- New node fades and expands into the top of the trail.
- Selecting a node traces its connector.
- Inspector slides in 12–20px and fades.
- Copy success changes icon and label.
- Anchor verification animates through its proof steps.
- Branches subtly draw when first entering the viewport.

### Avoid

- Constant pulsing nodes
- Moving blockchain particles
- Glowing neon
- Parallax in data screens
- Large scroll-jacking animations

Reduced-motion mode should replace all connector drawing with immediate state changes.

---

# 13. Recommended Image-Generation Set

The next visual batch should contain six deliberate boards rather than unrelated variations.

## Board 1 — Desktop landing

Show:

- warm editorial hero;
- botanical hand/sprout illustration;
- compact metrics;
- vertical live funding trail;
- selected receipt inspector;
- below-fold process preview.

## Board 2 — Full funding explorer

Show:

- summary strip;
- filters and search;
- large vertical funding network;
- anchor checkpoints;
- sticky inspector with `Обзор / Доказательство / Чек / Приватность / Данные`.

## Board 3 — Event-state sheet

Show detailed inspector variants for:

- donation;
- disbursement;
- receipt;
- anchor;
- correction.

This establishes the reusable component system before drawing every page.

## Board 4 — Donate and Verify

Two desktop screens on one board:

- focused QR donation flow;
- simplified verification status and proof chain.

## Board 5 — Mobile

Show:

- mobile landing;
- vertical trail;
- selected event bottom sheet;
- mobile donate card.

## Board 6 — Admin workspace

Show:

- admin dashboard;
- disbursement form with public preview;
- delivery queue split pane;
- anchor confirmation state.
