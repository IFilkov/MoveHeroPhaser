// Инициализация конфигурации игры
// const config = {
//   type: Phaser.AUTO,
//   width: window.innerWidth,
//   height: window.innerHeight,
//   physics: {
//     default: "arcade",
//     arcade: {
//       gravity: { y: 0 },
//       debug: false,
//     },
//   },
//   scene: {
//     preload: preload,
//     create: create,
//     update: update,
//   },
// };
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#ffffff",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    gamepad: true, // Включаем поддержку геймпадов
  },
};

const game = new Phaser.Game(config);

// Переменные для игрового объекта и времени смены направления
let circle;
let circleBody;
let direction = { x: 1, y: 1 };
let speed = 100; // скорость передвижения
let changeDirectionTime = 4000; // смена направления каждые 8 секунд
let lastDirectionChange = 0;

// Функция для предзагрузки ресурсов (если необходимо)
function preload() {
  // В данном случае ресурсы не загружаем, но функция обязательна для Phaser
}

// Функция для создания начальных объектов в игре
function create() {
  // Создание графического объекта круга
  let graphics = this.add.graphics({ fillStyle: { color: 0x00ff00 } });
  circle = graphics.fillCircle(0, 0, 10);

  // Создаем физическое тело и добавляем его на сцену
  circleBody = this.add.circle(
    config.width / 2,
    config.height / 2,
    10,
    0x00ff00
  );
  this.physics.add.existing(circleBody);
  circleBody.body.setCollideWorldBounds(true);
  circleBody.body.setBounce(1, 1);

  // Установка таймера для смены направления
  lastDirectionChange = this.time.now;
}

// Функция смены направления
function changeDirection() {
  direction.x = Phaser.Math.Between(-1, 1);
  direction.y = Phaser.Math.Between(-1, 1);

  // Убедимся, что направление не равно нулю по обеим осям
  if (direction.x === 0 && direction.y === 0) {
    direction.x = 1;
  }
}

// Основная функция обновления игры
function update(time, delta) {
  // Смена направления каждые 8 секунд
  if (time - lastDirectionChange > changeDirectionTime) {
    changeDirection();
    lastDirectionChange = time;
  }

  // Обновление позиции круга на экране
  circleBody.x += direction.x * speed * (delta / 1000);
  circleBody.y += direction.y * speed * (delta / 1000);

  // Проверка границ экрана и отражение
  if (circleBody.x <= 0 || circleBody.x >= config.width) {
    direction.x *= -1;
  }
  if (circleBody.y <= 0 || circleBody.y >= config.height) {
    direction.y *= -1;
  }
}
