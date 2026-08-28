# Онлайн-запись к мастеру — Firebase + GitHub Pages

Готовый адаптивный интерфейс по мотивам предоставленного скриншота: голубой верхний блок, карточка мастера, рейтинг, описание, карта, услуги, специалисты, отзывы, фиксированная кнопка «Записаться», регистрация клиента и календарь записи.

## Архитектура

- `index.html` — клиентская страница.
- `admin.html` — отдельная админ-панель. Ссылка на неё отсутствует на клиентской странице.
- `css/styles.css` — вся стилизация.
- `js/firebase-config.js` — конфигурация вашего Firebase.
- `js/firebase.js` — инициализация Firebase.
- `js/auth.js` — регистрация, вход, выход.
- `js/calendar.js` — переиспользуемый календарь и слоты.
- `js/app.js` — клиентская страница, каталог, запись.
- `js/admin.js` — админка: журнал, мастера, услуги, отзывы.
- `firestore.rules` — правила доступа к данным.
- `assets/master.svg` — нейтральное демонстрационное фото мастера.

## 1. Firebase

1. Создайте проект в Firebase Console.
2. Включите **Authentication → Sign-in method → Email/Password**.
3. Создайте **Firestore Database**.
4. Добавьте Web App и скопируйте конфигурацию в `js/firebase-config.js`.
5. Опубликуйте `firestore.rules` в Firestore Rules.

## 2. Первый администратор

Админка не должна «надеяться» только на скрытую ссылку. Вход защищается Firestore Rules.

После регистрации нужного аккаунта откройте Firebase Console → Firestore → создайте коллекцию `admins` и документ с **ID = UID пользователя**.

Пример:

`admins/XXXXXXXXXXXXXXXX`

UID можно взять в Firebase Console → Authentication → Users.

После этого откройте:

`https://ВАШ-ЛОГИН.github.io/ВАШ-РЕПОЗИТОРИЙ/admin.html`

Пользователь без документа `admins/{uid}` не сможет войти в панель даже если узнает URL.

## 3. Начальные данные

В клиентском интерфейсе есть демо-данные для первого запуска. После заполнения Firebase можно создать реальные документы:

### `masters`

Поля: `name`, `role`, `hours`, `bookingEnabled`.

### `services`

Поля: `name`, `price`, `duration`, `active`.

### `appointments`

Создаются автоматически при записи клиента. Основные поля: `clientId`, `clientName`, `clientEmail`, `masterId`, `masterName`, `serviceId`, `serviceName`, `date`, `time`, `status`, `createdAt`.

### `reviews`

Предусмотрены поля: `clientId`, `text`, `rating`, `createdAt`, `status`.

## 4. GitHub Pages

Загрузите файлы в репозиторий без сборщика, например:

```text
/
  index.html
  admin.html
  /css/styles.css
  /js/*.js
  /assets/master.svg
  firestore.rules
```

В GitHub: **Settings → Pages → Deploy from branch**.

GitHub Pages работает с ES-модулями Firebase через CDN, отдельный Node.js-сервер не нужен.

## 5. Как устроена приватность админки

`admin.html` намеренно вынесен в отдельный файл, не указан в меню клиента и помечен `noindex`. Это скрывает интерфейс от обычной навигации, но настоящую защиту обеспечивает только Firebase Authentication + правило `isAdmin()`.

## Что можно расширить дальше

Добавить SMS/Telegram-уведомления, перенос и отмену записи клиентом, повторную запись, чёрный список, предоплату, полноценную сетку рабочего времени, загрузку фото мастеров в Firebase Storage, портфолио и полноценную модерацию отзывов. Это соответствует типовым возможностям онлайн-записи DIKIDI: выбор услуги, сотрудника и времени, а также журнал записей.
