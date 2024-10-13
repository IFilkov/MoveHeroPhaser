// window.localStorage.clear();
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

let hero;
let enemy1;
let enemy2;
let enemy3;
let enemy4;
let enemy5;
let enemy6;
let graphics;
let scoreText;
let score = 0;
let healthBar;
let healthBarBg;
let health = 100; // Начальный уровень здоровья

let cursors;
let pointer;
let gamepad;

let gridWidth, gridHeight; // Количество ячеек по ширине и высоте

let isAutoPlay = false;
let targetSpectator = null;

// Параметры для зрителей
const numRows = 20; // Количество рядов
const numSeatsPerRow = 20; // Количество мест в ряду
const seatSpacing = 10; // Расстояние между местами
const seatRadius = 10; // Радиус кружков-зрителей
const spectatorSpeed = 100; // Скорость перемещения зрителей
const spectatorInterval = 1000; // Интервал появления зрителей (в миллисекундах)
// Добавляем массив для зрителей с коллизией
let collidedSpectators = [];

let spectators2 = []; // Массив для зрителей2

// Переменные для отслеживания появления зрителей
let spectatorTimer = 0; // Время последнего появления зрителя
let spectatorsCreated = 0; // Количество созданных зрителей

// Инициализация текста для TopScore
let topScore = localStorage.getItem("topScore")
  ? parseInt(localStorage.getItem("topScore"))
  : 0;
let topScoreText;
let newRecordText;
let gameOver = false;

const spectators = [];
const spectatorRadius = 10;
const gridSize = 50; // Размер клетки сетки
const rows = 20; // Количество рядов
const cols = 20; // Количество колонок
const seatWidth = 15;
const seatHeight = 15;
const seatGap = 5; // Промежуток между сидениями
const rowGap = seatHeight; // Промежуток между рядами
let seats = []; // Массив мест для зрителей
let availableSeats = []; // Доступные места
let lastEnemyCollisionTime = 0; // Время последней коллизии с врагом
let isMoving = false; // Флаг, показывающий, что герой в движении

let spectatorsToPlace = []; // Массив для зрителей, которым нужно занять место

const collisionCooldown = 1000; // Задержка в миллисекундах между уменьшением здоровья

let autoPlayEnabled = false; // Флаг для режима AutoPlay
let randomPoints = []; // Массив для хранения случайных точек
let currentPointIndex = 0; // Индекс текущей точки

let heroDirectionX = 0;
let heroDirectionY = 0;
let movingRandomly = false;

let direction = { x: 1, y: 1 };
// let direction = new Phaser.Math.Vector2(
//   Phaser.Math.Between(-1, 1),
//   Phaser.Math.Between(-1, 1)
// );
let speed = 200; // скорость передвижения

let maxSpeed = 300;
let minSpeed = 200;
let maxAngleChange = 0.2; // максимальное отклонение в радианах (~11 градусов)

let changeDirectionTime = 2000; // смена направления каждые 8 секунд
let lastDirectionChange = 0;
let controlMode = "autopilot"; // Режим управления: 'autopilot', 'mouse', 'gamepad'
let mousePos = { x: 0, y: 0 }; // Позиция курсора

function preload() {
  if (!this.textures.exists("empty")) {
    const canvas = this.textures.createCanvas("empty", 1, 1).context;
    canvas.fillStyle = "rgba(0,0,0,0)";
    canvas.fillRect(0, 0, 1, 1);
    this.textures.get("empty").refresh();
  }
}

// Функция смены направления с отклонением
function changeDirection() {
  // Добавляем небольшое отклонение в текущем направлении
  let angle = Phaser.Math.FloatBetween(-maxAngleChange, maxAngleChange); // рандомный угол отклонения
  direction.rotate(angle); // вращаем текущий вектор направления

  direction.x = Phaser.Math.Between(-1, 1);
  direction.y = Phaser.Math.Between(-1, 1);
  // Рандомизируем скорость
  speed = Phaser.Math.Between(minSpeed, maxSpeed);

  // Нормализуем вектор направления для правильного движения
  direction.normalize();
}

function create() {
  graphics = this.add.graphics({ fillStyle: { color: 0xffffff } });

  hero = this.physics.add.image(400, 300, "empty");
  hero.radius = spectatorRadius;
  hero.color = 0x0000ff;
  hero.speed = 200;
  hero.setCollideWorldBounds(true);

  enemy1 = this.physics.add.image(100, 100, "empty");
  enemy1.radius = spectatorRadius;
  enemy1.color = 0x000000;
  enemy1.speed = 100;
  enemy1.setCollideWorldBounds(true);

  enemy2 = this.physics.add.image(700, 500, "empty");
  enemy2.radius = spectatorRadius;
  enemy2.color = 0xff0000;
  enemy2.speed = 160;
  enemy2.setCollideWorldBounds(true);

  enemy3 = this.physics.add.image(400, 500, "empty");
  enemy3.radius = 40;
  enemy3.color = 0x663300;
  enemy3.speed = 110;
  enemy3.setCollideWorldBounds(true);

  enemy4 = this.physics.add.image(50, 150, "empty");
  enemy4.radius = spectatorRadius;
  enemy4.color = 0xcccc00;
  enemy4.speed = 90;
  enemy4.setCollideWorldBounds(true);

  enemy5 = this.physics.add.image(150, 150, "empty");
  enemy5.radius = spectatorRadius;
  enemy5.color = 0x99ffff;
  enemy5.speed = 190;
  enemy5.setCollideWorldBounds(true);

  enemy6 = this.physics.add.image(250, 250, "empty");
  enemy6.radius = spectatorRadius;
  enemy6.color = 0xff3300;
  enemy6.speed = 180;
  enemy6.setCollideWorldBounds(true);

  // Создание группы зрителей для обработки коллизий
  this.spectatorGroup = this.physics.add.group();
  // addSpectator({ x: 100, y: 200 });
  // moveToRandomSpectator(); // Это должно быть вызвано после добавления зрителей

  // Создание зрителей
  createSpectatorPositions();
  this.time.addEvent({
    delay: 1000,
    callback: addSpectator,
    callbackScope: this,
    loop: true,
  });

  // Установка начальных координат цели
  hero.targetX = hero.x;
  hero.targetY = hero.y;

  // Установка таймера для смены направления
  lastDirectionChange = this.time.now;

  // Вычисляем количество ячеек по горизонтали и вертикали
  gridWidth = this.sys.game.config.width / gridSize;
  gridHeight = this.sys.game.config.height / gridSize;

  this.input.keyboard.on("keydown-SPACE", () => {
    console.log("AutoMode");
    if (controlMode === "autopilot") {
      controlMode = "mouse";
    } else {
      controlMode = "autopilot";
    }
  });

  this.input.on("pointermove", (pointer) => {
    mousePos.x = pointer.x;
    mousePos.y = pointer.y;
  });

  let pad = this.input.gamepad.getPad(0); // Получаем первый подключенный геймпад
  if (pad) {
    pad.removeAllListeners(); // Безопасно удаляем всех слушателей
  }
  // Отслеживание события подключения геймпада
  this.input.gamepad.on("connected", (pad) => {
    gamepad = pad;
    console.log("Gamepad connected:", gamepad);
  });

  // Проверка на наличие геймпада (если подключен заранее)
  if (this.input.gamepad.total > 0) {
    gamepad = this.input.gamepad.getPad(0);
  }

  // Создаем места для зрителей (в левой части экрана)
  const leftPadding = 50;
  const topPadding = 50;

  for (let row = 0; row < numRows; row++) {
    for (let seat = 0; seat < numSeatsPerRow; seat++) {
      const x = leftPadding + seat * seatSpacing;
      const y = topPadding + row * seatSpacing;

      // Создаем кружки для мест
      const seatCircle = this.add.circle(x, y, seatRadius, 0x000000); // Черные кружки как места
      seats.push({ x, y, occupied: false });
    }
  }

  window.addEventListener("resize", resizeGame);

  // Рисуем места для зрителей
  drawSeats(50, 50, rows, cols); // Пример параметров: начальная позиция (50, 50), 20 рядов, 20 колонок

  // Создание текста для счётчика
  scoreText = this.add.text(config.width - 100, 20, "Score: 0", {
    fontSize: "20px",
    fill: "#000",
  });
  scoreText.setScrollFactor(0);

  topScoreText = this.add.text(
    config.width - 200,
    20,
    "Top Score: " + topScore,
    {
      fontSize: "20px",
      fill: "#000",
    }
  );
  topScoreText.setScrollFactor(0);

  autoPlayText = this.add
    .text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      "AutoPlay",
      {
        fontSize: "48px",
        fill: "#f00",
      }
    )
    .setOrigin(0.5);
  autoPlayText.setVisible(false);

  // Инициализация текста New record!
  newRecordText = this.add.text(
    this.cameras.main.width / 2,
    this.cameras.main.height / 2,
    "New record!",
    { fontSize: "48px", fill: "#f00" }
  );
  newRecordText.setOrigin(0.5);
  newRecordText.setVisible(false);

  // Проверка, был ли установлен новый рекорд
  if (localStorage.getItem("newRecord") === "true") {
    localStorage.setItem("newRecord", "false");
    showNewRecordText();
  }

  // Создание фона для шкалы здоровья
  healthBarBg = this.add.graphics();
  healthBarBg.fillStyle(0x000000, 1);
  healthBarBg.fillRect(config.width - 200, 50, 150, 20);
  healthBarBg.setScrollFactor(0);

  // Создание шкалы здоровья
  healthBar = this.add.graphics();
  healthBar.setScrollFactor(0);
  updateHealthBar();

  // Обработка коллизий
  this.physics.add.overlap(
    hero,
    this.spectatorGroup,
    handleHeroSpectatorCollision,
    null,
    this
  );
  this.physics.add.overlap(hero, enemy1, handleHeroEnemyCollision, null, this);
  this.physics.add.overlap(hero, enemy2, handleHeroEnemyCollision, null, this);
  this.physics.add.overlap(hero, enemy3, handleHeroEnemyCollision, null, this);
  this.physics.add.overlap(hero, enemy4, handleHeroEnemyCollision, null, this);
  this.physics.add.overlap(hero, enemy5, handleHeroEnemyCollision, null, this);
  this.physics.add.overlap(hero, enemy6, handleHeroEnemyCollision, null, this);
  // Обработка коллизий между врагами и зрителями
  this.physics.add.overlap(
    enemy1,
    this.spectatorGroup,
    handleEnemy1SpectatorCollision,
    null,
    this
  );
  this.physics.add.overlap(
    enemy2,
    this.spectatorGroup,
    handleEnemy2SpectatorCollision,
    null,
    this
  );
  this.physics.add.overlap(
    enemy3,
    this.spectatorGroup,
    handleEnemy3SpectatorCollision,
    null,
    this
  );
  this.physics.add.overlap(
    enemy4,
    this.spectatorGroup,
    handleEnemy4SpectatorCollision,
    null,
    this
  );
  this.physics.add.overlap(
    enemy5,
    this.spectatorGroup,
    handleEnemy5SpectatorCollision,
    null,
    this
  );
  this.physics.add.overlap(
    enemy6,
    this.spectatorGroup,
    handleEnemy6SpectatorCollision,
    null,
    this
  );
}

// Основная функция обновления игры
function update(time, delta) {
  if (controlMode === "mouse") {
    moveToMouse(delta);
  } else if (controlMode === "gamepad" && gamepad) {
    moveWithGamepad(delta);
  } else {
    // moveToRandomSpectator();
    moveRandomly(time, delta);
  }

  // Проверяем нажатие кнопки A на геймпаде для переключения между геймпадом и автопилотом
  if (gamepad && gamepad.buttons[0].pressed && !isButtonPressed) {
    // Кнопка A на геймпаде
    isButtonPressed = true; // Отмечаем, что кнопка нажата
    if (controlMode === "autopilot") {
      controlMode = "gamepad";
    } else {
      controlMode = "autopilot";
    }
  }

  // Сбрасываем флаг, если кнопка A отпущена
  if (gamepad && !gamepad.buttons[0].pressed) {
    isButtonPressed = false;
  }
  // Появление зрителей с интервалом 1 секунда
  if (
    time - spectatorTimer > spectatorInterval &&
    spectatorsCreated < numRows * numSeatsPerRow
  ) {
    createSpectator(this); // Передаем контекст сцены
    spectatorTimer = time; // Обновляем время последнего появления
    spectatorsCreated++; // Увеличиваем количество созданных зрителей
  }

  // Обрабатываем перемещение зрителей к своим местам
  spectatorsToPlace.forEach((spectator2, index) => {
    const targetSeat = findFreeSeat();

    if (targetSeat) {
      const dx = targetSeat.x - spectator2.x;
      const dy = targetSeat.y - spectator2.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Движение зрителя к свободному месту
      if (distance > 1) {
        const angle = Math.atan2(dy, dx);
        spectator2.x += Math.cos(angle) * spectatorSpeed * (delta / 1000);
        spectator2.y += Math.sin(angle) * spectatorSpeed * (delta / 1000);
      } else {
        // Если зритель добрался до места, помечаем место как занятое
        targetSeat.occupied = true;
        spectatorsToPlace.splice(index, 1); // Убираем зрителя из списка перемещающихся
      }
    }
  });

  // Проверяем коллизию hero со зрителями
  spectators2.forEach((spectator2) => {
    if (checkCollision(hero, spectator2)) {
      if (!collidedSpectators.includes(spectator2)) {
        spectator2.fillColor = 0x800080; // Фиолетовый цвет для зрителя при коллизии
        collidedSpectators.push(spectator2); // Добавляем зрителя в массив коллизий
      }
    }
  });

  graphics.clear();
  graphics.fillStyle(0xffffff, 1);
  graphics.fillRect(0, 0, config.width, config.height);

  drawCircle(hero.x, hero.y, hero.radius, hero.color);
  drawCircle(enemy1.x, enemy1.y, enemy1.radius, enemy1.color);
  drawCircle(enemy2.x, enemy2.y, enemy2.radius, enemy2.color);
  drawCircle(enemy3.x, enemy3.y, enemy3.radius, enemy3.color);
  drawCircle(enemy4.x, enemy4.y, enemy4.radius, enemy4.color);
  drawCircle(enemy5.x, enemy5.y, enemy5.radius, enemy5.color);
  drawCircle(enemy6.x, enemy6.y, enemy6.radius, enemy6.color);

  // Обновление позиций зрителей
  updateSpectators();

  updateEnemyPosition.call(this, enemy1);
  updateEnemyPosition.call(this, enemy2);
  updateEnemyPosition.call(this, enemy3);
  updateEnemyPosition.call(this, enemy4);
  updateEnemyPosition.call(this, enemy5);
  updateEnemyPosition.call(this, enemy6);
  // updateHeroPosition.call(this);
  // updateEnemy1Position.call(this);
  // updateEnemy2Position.call(this);

  // Обновление позиции счётчика и шкалы здоровья при изменении размера окна
  scoreText.setPosition(config.width / 2 - 50, 20);
  topScoreText.setPosition(config.width / 2 - 80, 600);
  healthBarBg.setPosition(config.width / 2 - 75, 50);
  updateHealthBar();

  let speed = 200;
}

// Функция проверки коллизии
function checkCollision(hero, spectator2) {
  const dx = spectator2.x - hero.x;
  const dy = spectator2.y - hero.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Проверка, меньше ли расстояние суммы радиусов объектов (10 для hero и seatRadius для зрителей)
  return distance < 10 + seatRadius;
}

// Функция перемещения к мыши
function moveToMouse(delta) {
  const dx = mousePos.x - hero.x;
  const dy = mousePos.y - hero.y;
  const angle = Math.atan2(dy, dx);

  hero.x += Math.cos(angle) * speed * (delta / 1000);
  hero.y += Math.sin(angle) * speed * (delta / 1000);
}

// Функция перемещения с геймпада
function moveWithGamepad(delta) {
  const axisX = gamepad.axes[0].getValue(); // Горизонтальная ось (левый стик)
  const axisY = gamepad.axes[1].getValue(); // Вертикальная ось (левый стик)

  hero.x += axisX * speed * (delta / 1000);
  hero.y += axisY * speed * (delta / 1000);

  // Проверка границ экрана и отражение
  if (hero.x <= 0 || hero.x >= config.width) {
    direction.x *= -1;
  }
  if (hero.y <= 0 || hero.y >= config.height) {
    direction.y *= -1;
  }
}

function drawCircle(x, y, radius, color) {
  graphics.fillStyle(color, 1);
  graphics.fillCircle(x, y, radius);
}

function updateEnemyPosition(enemy) {
  if (hero && enemy) {
    if (enemy === enemy3) {
      const targetSpectator = findClosestSpectatorToEnemy3();
      if (targetSpectator) {
        enemy.targetSpectator = targetSpectator;
        // enemy.targetSpectator.inCollisionWithEnemy3 = true;
      }
    }
    if (enemy === enemy1) {
      const targetSpectator = findClosestSpectatorForEnemy1();
      if (targetSpectator) {
        enemy.targetSpectator = targetSpectator;
        // enemy.targetSpectator.inCollisionWithEnemy3 = true;
      }
    }

    if (enemy === enemy2) {
      const targetSpectator = handleEnemy2Behavior.call(this);
      if (targetSpectator) {
        enemy.targetSpectator = targetSpectator;
        // enemy.targetSpectator.inCollisionWithEnemy3 = true;
      }
    }

    if (enemy === enemy4) {
      const targetSpectator = findClosestSpectatorToEnemy4();
      if (targetSpectator) {
        enemy.targetSpectator = targetSpectator;
        // enemy.targetSpectator.inCollisionWithEnemy3 = true;
      }
    }

    if (enemy === enemy5) {
      const targetSpectator = findClosestSpectatorToEnemy5();
      if (targetSpectator) {
        enemy.targetSpectator = targetSpectator;
        // enemy.targetSpectator.inCollisionWithEnemy3 = true;
      }
    }

    if (enemy === enemy6) {
      const targetSpectator = findClosestSpectatorToEnemy6();
      if (targetSpectator) {
        enemy.targetSpectator = targetSpectator;
        // enemy.targetSpectator.inCollisionWithEnemy3 = true;
      }
    }

    if (enemy.targetSpectator && !enemy.targetSpectator.moving) {
      enemy.targetSpectator = null;
    }

    if (enemy.targetSpectator) {
      this.physics.moveToObject(enemy, enemy.targetSpectator, enemy.speed);
    } else {
      this.physics.moveToObject(enemy, hero, enemy.speed);
    }
  }
}

// function moveToRandomSpectator() {
//   if (!this.spectatorGroup || this.spectatorGroup.getChildren().length === 0) {
//     console.error("Spectator group is undefined or empty.");
//     return;
//   }
//   // Пример использования randomSpectator в авто-пилоте

//   let randomSpectator = getRandomSpectator.call(this);
//   if (!this.spectatorGroup || this.spectatorGroup.getChildren().length === 0) {
//     console.error("Spectator group is undefined or empty.");
//     return;
//   }
//   if (randomSpectator) {
//     console.log("Moving to Spectator:", randomSpectator);
//     this.physics.moveToObject(hero, randomSpectator, speed);
//   }
// }

// Функция создания одного зрителя
function createSpectator(scene) {
  const x = Phaser.Math.Between(config.width - 100, config.width - 50); // В правой части экрана
  const y = Phaser.Math.Between(50, config.height - 50); // Случайная высота

  // Создаем синий кружок как зрителя
  const spectator2 = scene.add.circle(x, y, seatRadius, 0x0000ff);
  spectators2.push(spectator2);
  spectatorsToPlace.push(spectator2); // Добавляем в массив для размещения
}
// Функция случайного перемещения
// function moveRandomly(time, delta) {
//   if (time - lastDirectionChange > changeDirectionTime) {
//     changeDirection();
//     lastDirectionChange = time;
//   }

//   // Обновление позиции героя
//   hero.x += direction.x * speed * (delta / 1000);
//   hero.y += direction.y * speed * (delta / 1000);

//   // Поворачиваем героя в направлении движения
//   hero.rotation = Math.atan2(direction.y, direction.x);

//   // Проверка границ экрана и отражение
//   if (hero.x <= 0 || hero.x >= config.width) {
//     direction.x *= -1;
//   }
//   if (hero.y <= 0 || hero.y >= config.height) {
//     direction.y *= -1;
//   }
// }
// Функция для перемещения к случайным зрителям, игнорируя тех, с которыми была коллизия или которые заняли свои места
function moveRandomly(time, delta) {
  console.log("Погнали!!!");
  if (
    !targetSpectator ||
    time - lastDirectionChange > changeDirectionTime ||
    targetSpectatorReached()
  ) {
    // Находим нового случайного зрителя, который еще не столкнулся с hero и не занял свое место
    targetSpectator = getNewRandomSpectator();
    lastDirectionChange = time; // Обновляем время последней смены цели
  }

  if (targetSpectator) {
    const dx = targetSpectator.x - hero.x;
    const dy = targetSpectator.y - hero.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1) {
      const angle = Math.atan2(dy, dx);
      hero.x += Math.cos(angle) * speed * (delta / 1000);
      hero.y += Math.sin(angle) * speed * (delta / 1000);
    } else {
      // Если hero достиг цели, выбираем нового случайного зрителя
      targetSpectator = getNewRandomSpectator();
    }
  }
}

// Функция для получения нового случайного зрителя
function getNewRandomSpectator() {
  const availableSpectators = spectators2.filter(
    (spectator2) =>
      !collidedSpectators.includes(spectator2) && !isSpectatorAtSeat(spectator2)
  );

  if (availableSpectators.length > 0) {
    return Phaser.Utils.Array.GetRandom(availableSpectators); // Возвращаем случайного зрителя, который подходит по условиям
  }

  return null; // Если таких зрителей нет, возвращаем null
}

function isSpectatorAtSeat(spectator2) {
  return seats.some((seat) => {
    const distance = Math.sqrt(
      (seat.x - spectator2.x) ** 2 + (seat.y - spectator2.y) ** 2
    );
    return distance < 1 && seat.occupied;
  });
}

// Функция для проверки, достиг ли hero своего текущего целевого зрителя
function targetSpectatorReached() {
  console.log("Я вызываюсь!");
  const dx = targetSpectator.x - hero.x;
  const dy = targetSpectator.y - hero.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= 1; // Если hero достаточно близко, считаем, что цель достигнута
}

let currentTarget = null; // Ссылка на текущего зрителя-цель
let spectatorsGroup; // Объявляем глобально

function resizeGame() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  game.scale.resize(width, height);
}

// Функция для создания позиций зрителей в виде сетки
function createSpectatorPositions() {
  const startX = 50; // Начальная позиция X для сетки мест
  const startY = 50; // Начальная позиция Y для сетки мест

  spectators.length = 0; // Очищаем массив зрителей
  availableSeats.length = 0; // Очищаем массив доступных мест

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const seat = {
        x: startX + j * (seatWidth + seatGap),
        y: startY + i * (seatHeight + rowGap + seatGap),
        occupied: false,
      };
      spectators.push(seat);
      availableSeats.push(seat);
    }
  }
}

// Функция для добавления зрителя
function addSpectator() {
  if (availableSeats.length > 0) {
    const y = Phaser.Math.Between(0, config.height);
    const x = config.width + spectatorRadius; // Начальная позиция за пределами правой стороны холста
    const targetIndex = Phaser.Math.Between(0, availableSeats.length - 1);
    const target = availableSeats.splice(targetIndex, 1)[0]; // Удаляем место из доступных и получаем его

    if (target) {
      target.occupied = true;
      const randomSpeed = Phaser.Math.Between(40, 100); // Случайная скорость от 40 до 100

      const isYellow = (spectators.length + 1) % 10 === 0; // Логика для каждого десятого зрителя
      const spectator = {
        x,
        y,
        targetX: target.x,
        targetY: target.y,
        speed: randomSpeed,
        color: isYellow ? 0xffff00 : 0x000000, // Устанавливаем желтый цвет для каждого десятого зрителя
        moving: true,
        scored: false, // Флаг для проверки начисления очков
        // новые свойства
        inCollisionWithHero: false, // Флаг коллизии с героем
        inCollisionWithEnemy1: false, // Флаг коллизии с врагом1
        inCollisionWithEnemy2: false, // Флаг коллизии с врагом2
        inCollisionWithEnemy3: false, // Флаг коллизии с врагом3
        targetedByEnemy3: false, // Флаг преследования врагом3
        inCollisionWithEnemy4: false,
        targetedByEnemy4: false,
        inCollisionWithEnemy5: false,
        targetedByEnemy5: false,
        inCollisionWithEnemy6: false,
        targetedByEnemy6: false,
        isYellow: isYellow, // Флаг для желтого зрителя
      };
      spectators.push(spectator);
      const spectatorSprite = game.scene.scenes[0].spectatorGroup.create(
        spectator.x,
        spectator.y,
        "empty"
      );

      console.log("Spectator added at: ", spectator.x, spectator.y);
      console.log(
        "Total spectators in group: ",
        this.spectatorGroup.getChildren().length
      );

      spectatorSprite.radius = spectatorRadius;
      spectatorSprite.setCircle(spectatorRadius); // Установим круглый коллайдер для спрайта
      spectatorSprite.setCollideWorldBounds(true);
      spectator.sprite = spectatorSprite;

      // Устанавливаем цвет зрителя
      spectator.sprite.setTint(spectator.color);
    }
  }
}

function updateSpectators() {
  spectators.forEach((spectator) => {
    if (spectator.moving) {
      const angle = Phaser.Math.Angle.Between(
        spectator.x,
        spectator.y,
        spectator.targetX,
        spectator.targetY
      );
      spectator.x +=
        (Math.cos(angle) * spectator.speed * game.loop.delta) / 1000;
      spectator.y +=
        (Math.sin(angle) * spectator.speed * game.loop.delta) / 1000;

      if (
        Phaser.Math.Distance.Between(
          spectator.x,
          spectator.y,
          spectator.targetX,
          spectator.targetY
        ) < 1
      ) {
        spectator.moving = false;
        spectator.color = 0x008800;
        spectator.sprite.setPosition(spectator.targetX, spectator.targetY); // Обновляем позицию спрайта
        if (spectator.inCollisionWithEnemy1) {
          spectator.inCollisionWithEnemy1 = false;
          enemy1.targetSpectator = null; // Враг 1 больше не преследует этого зрителя
        }
        if (spectator.inCollisionWithEnemy2) {
          spectator.inCollisionWithEnemy2 = false;
          enemy2.targetSpectator = null; // Враг 2 больше не преследует этого зрителя
        }
        if (spectator.inCollisionWithEnemy3) {
          spectator.inCollisionWithEnemy3 = false;
          enemy3.targetSpectator = null; // Враг 3 больше не преследует этого зрителя
        }
        if (spectator.inCollisionWithEnemy4) {
          spectator.inCollisionWithEnemy4 = false;
          enemy4.targetSpectator = null; // Враг 3 больше не преследует этого зрителя
        }
        if (spectator.inCollisionWithEnemy5) {
          spectator.inCollisionWithEnemy5 = false;
          enemy5.targetSpectator = null; // Враг 3 больше не преследует этого зрителя
        }
        if (spectator.inCollisionWithEnemy6) {
          spectator.inCollisionWithEnemy6 = false;
          enemy6.targetSpectator = null; // Враг 3 больше не преследует этого зрителя
        }
      }
    }
    drawCircle(spectator.x, spectator.y, spectatorRadius, spectator.color);

    // Обновляем позицию спрайта зрителя
    if (spectator.sprite) {
      spectator.sprite.setPosition(spectator.x, spectator.y); // Обновляем позицию спрайта
    }
  });
}

function handleHeroSpectatorCollision(hero, spectatorSprite) {
  const spectator2 = spectators.find((s) => s.sprite === spectatorSprite);

  if (spectator2 && !spectator2.inCollisionWithHero) {
    // Устанавливаем флаг коллизии зрителя с героем
    spectator2.inCollisionWithHero = true;

    // Перекрашиваем зрителя в синий цвет
    spectator2.color = 0x0000ff;
    spectator2.sprite.setTint(spectator2.color);
    // Обработка желтых зрителей
    if (spectator2.isYellow) {
      // Прибавка к здоровью на 10%, но не больше максимума
      health = Math.min(health + 10, 100); // Прибавляем 10% здоровья
      updateHealthBar();
    }

    // Герой получает очки за зрителя, если он не желтый
    if (!spectator2.isYellow) {
      score += 1;
      scoreText.setText("Score: " + score);
    }

    // Сбрасываем флаги коллизий зрителя с врагами
    spectator2.inCollisionWithEnemy1 = false;
    spectator2.inCollisionWithEnemy2 = false;
    spectator2.inCollisionWithEnemy3 = false;
    spectator2.inCollisionWithEnemy4 = false;
    spectator2.inCollisionWithEnemy5 = false;
    spectator2.inCollisionWithEnemy6 = false;

    // Если зрителя преследует враг, сбрасываем targetSpectator у врага
    if (enemy1.targetSpectator === spectator2) {
      enemy1.targetSpectator = null;
    }
    if (enemy2.targetSpectator === spectator2) {
      enemy2.targetSpectator = null;
    }
    if (enemy3.targetSpectator === spectator2) {
      enemy3.targetSpectator = null;
    }
    if (enemy4.targetSpectator === spectator2) {
      enemy4.targetSpectator = null;
    }
    if (enemy5.targetSpectator === spectator2) {
      enemy5.targetSpectator = null;
    }
    if (enemy6.targetSpectator === spectator2) {
      enemy6.targetSpectator = null;
    }
  }
}

// Функция для обработки коллизий героя с врагами
function handleHeroEnemyCollision(hero, enemy) {
  const currentTime = this.time.now;

  if (currentTime - lastEnemyCollisionTime > collisionCooldown) {
    if (health > 0) {
      health -= 10;
      if (health <= 0) {
        health = 0;
        restartGame();
      }
      updateHealthBar();
      enemy.body.setVelocity(0, 0); // Останавливаем врага при коллизии
      enemy.body.reset(enemy.x, enemy.y); // Фиксируем позицию врага

      // Обновляем время последней коллизии
      lastEnemyCollisionTime = currentTime;
    }
  }
}

function handleEnemy1SpectatorCollision(enemy, spectatorSprite) {
  const spectator2 = spectators2.find((s) => s.sprite === spectatorSprite);
  if (
    spectator2 &&
    !spectator2.inCollisionWithHero &&
    !spectator2.inCollisionWithEnemy1
  ) {
    spectator2.color = 0xffa500; // Перекрашиваем зрителя в оранжевый цвет
    spectator2.inCollisionWithEnemy1 = true;
    enemy.targetSpectator = spectator2; // Враг1 переключается на этого зрителя
    console.log("Set inCollisionWithEnemy1 to true for spectator:", spectator2);
    score = Math.max(score - 1, 0); // Уменьшаем очки героя на 1, но не меньше 0
    scoreText.setText("Score: " + score);
  }
}

function handleEnemy2SpectatorCollision(enemy, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);
  if (
    spectator &&
    !spectator.inCollisionWithHero &&
    !spectator.inCollisionWithEnemy2
  ) {
    spectator.color = 0x800080; // Перекрашиваем зрителя в фиолетовый цвет
    spectator.inCollisionWithEnemy2 = true;
    enemy.targetSpectator = spectator; // Враг2 переключается на этого зрителя
    console.log("Set inCollisionWithEnemy2 to true for spectator:", spectator);
    score = Math.max(score - 1, 0); // Уменьшаем очки героя на 1, но не меньше 0
    scoreText.setText("Score: " + score);
  }
}

function handleEnemy3SpectatorCollision(enemy, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);

  console.log("Enemy3 collision detected:");
  console.log("Spectator found:", spectator);
  console.log(
    "Spectator in collision with hero:",
    spectator?.inCollisionWithHero
  );
  console.log(
    "Spectator in collision with enemy3:",
    spectator?.inCollisionWithEnemy3
  );

  if (!spectator) {
    console.log("No valid spectator found.");
  } else {
    if (!spectator.inCollisionWithHero) {
      console.log("Spectator was not in collision with hero.");
    }
    if (spectator.inCollisionWithEnemy3) {
      console.log("Spectator was already in collision with enemy3.");
    }
    if (
      spectator &&
      spectator.inCollisionWithHero &&
      !spectator.inCollisionWithEnemy3
    ) {
      console.log("Updating spectator color and score.");
      spectator.color = 0xff99ff; // Перекрашиваем зрителя в розовый цвет
      spectator.inCollisionWithEnemy3 = true; // Устанавливаем флаг, что зритель в коллизии с врагом3
      console.log(
        "Set inCollisionWithEnemy3 to true for spectator:",
        spectator
      );
      enemy.targetSpectator = spectator; // Враг3 переключается на этого зрителя
      score = Math.max(score - 1, 0); // Уменьшаем очки героя на 1, но не меньше 0
      scoreText.setText("Score: " + score);

      console.log("Spectator color updated to pink.");
      console.log(
        "Spectator in collision with enemy3:",
        spectator.inCollisionWithEnemy3
      );
      console.log("Hero's score:", score);
    }
  }
}

function handleEnemy4SpectatorCollision(enemy, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);

  if (!spectator) {
    console.log("No valid spectator found.");
  } else {
    if (!spectator.inCollisionWithHero) {
      console.log("Spectator was not in collision with hero.");
    }
    if (spectator.inCollisionWithEnemy4) {
      console.log("Spectator was already in collision with enemy4.");
    }
    if (
      spectator &&
      spectator.inCollisionWithHero &&
      !spectator.inCollisionWithEnemy4
    ) {
      console.log("Updating spectator color and score.");
      spectator.color = 0xff99ff; // Перекрашиваем зрителя в розовый цвет
      spectator.inCollisionWithEnemy4 = true; // Устанавливаем флаг, что зритель в коллизии с врагом3
      console.log(
        "Set inCollisionWithEnemy4 to true for spectator:",
        spectator
      );
      enemy.targetSpectator = spectator; // Враг3 переключается на этого зрителя
      // score = Math.max(score - 1, 0); // Уменьшаем очки героя на 1, но не меньше 0
      score = Math.max(score + 1);
      scoreText.setText("Score: " + score);

      console.log("Spectator color updated to pink.");
      console.log(
        "Spectator in collision with enemy4:",
        spectator.inCollisionWithEnemy4
      );
      console.log("Hero's score:", score);
    }
  }
}

function handleEnemy5SpectatorCollision(enemy, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);

  if (!spectator) {
    console.log("No valid spectator found.");
  } else {
    if (!spectator.inCollisionWithHero) {
      console.log("Spectator was not in collision with hero.");
    }
    if (spectator.inCollisionWithEnemy5) {
      console.log("Spectator was already in collision with enemy5.");
    }
    if (
      spectator &&
      spectator.inCollisionWithHero &&
      !spectator.inCollisionWithEnemy5
    ) {
      console.log("Updating spectator color and score.");
      spectator.color = 0xff99ff; // Перекрашиваем зрителя в розовый цвет
      spectator.inCollisionWithEnemy5 = true; // Устанавливаем флаг, что зритель в коллизии с врагом3
      console.log(
        "Set inCollisionWithEnemy5 to true for spectator:",
        spectator
      );
      enemy.targetSpectator = spectator; // Враг3 переключается на этого зрителя
      // score = Math.max(score - 1, 0); // Уменьшаем очки героя на 1, но не меньше 0
      score = Math.max(score + 1);
      scoreText.setText("Score: " + score);

      console.log("Spectator color updated to pink.");
      console.log(
        "Spectator in collision with enemy5:",
        spectator.inCollisionWithEnemy5
      );
      console.log("Hero's score:", score);
    }
  }
}

function handleEnemy6SpectatorCollision(enemy, spectatorSprite) {
  const spectator = spectators.find((s) => s.sprite === spectatorSprite);

  if (!spectator) {
    console.log("No valid spectator found.");
  } else {
    if (!spectator.inCollisionWithHero) {
      console.log("Spectator was not in collision with hero.");
    }
    if (spectator.inCollisionWithEnemy6) {
      console.log("Spectator was already in collision with enemy6.");
    }
    if (
      spectator &&
      spectator.inCollisionWithHero &&
      !spectator.inCollisionWithEnemy6
    ) {
      console.log("Updating spectator color and score.");
      // spectator.color = 0xff99ff; // Перекрашиваем зрителя в розовый цвет

      const randomColor = Phaser.Display.Color.RandomRGB().color;

      spectator.color = randomColor;
      hero.color = randomColor;
      spectator.inCollisionWithEnemy6 = true; // Устанавливаем флаг, что зритель в коллизии с врагом3
      console.log(
        "Set inCollisionWithEnemy6 to true for spectator:",
        spectator
      );
      enemy.targetSpectator = spectator; // Враг3 переключается на этого зрителя
      score = Math.max(score - 1, 0); // Уменьшаем очки героя на 1, но не меньше 0
      // score = Math.max(score + 1);
      scoreText.setText("Score: " + score);

      console.log("Spectator color updated to pink.");
      console.log(
        "Spectator in collision with enemy6:",
        spectator.inCollisionWithEnemy6
      );
      console.log("Hero's score:", score);
    }
  }
}
// Функция для обновления шкалы здоровья
function updateHealthBar() {
  healthBar.clear();
  const healthBarWidth = 150 * (health / 100);
  const healthBarColor = health <= 20 ? 0xff0000 : 0x00ff00; // Красный цвет при <= 20%, иначе зелёный
  healthBar.fillStyle(healthBarColor, 1);
  healthBar.fillRect(config.width / 2 - 75, 50, (health / 100) * 150, 20);
}

// Движение героя к целевому зрителю
function moveToTarget(scene, targetSpectator) {
  if (targetSpectator) {
    scene.physics.moveToObject(scene.hero, targetSpectator, heroSpeed); // heroSpeed - скорость героя
  }
}

function moveHeroRandomly() {
  hero.setVelocityX(heroDirectionX * hero.speed);
  hero.setVelocityY(heroDirectionY * hero.speed);
  console.log("Я ТУТ!");
}

function findClosestSpectator() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  moveHeroRandomly();

  spectators.forEach((spectator) => {
    const distance = Phaser.Math.Distance.Between(
      hero.x,
      hero.y,
      spectator.x,
      spectator.y
    );
    if (distance < closestDistance && !spectator.inCollisionWithHero) {
      closestDistance = distance;
      closestSpectator = spectator;
    }
  });

  return closestSpectator;
}

function findClosestSpectatorForEnemy1() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  spectators.forEach((spectator) => {
    const isSpectatorTargeted =
      spectator === enemy2.targetSpectator ||
      spectator === enemy3.targetSpectator ||
      spectator === enemy4.targetSpectator ||
      spectator === enemy5.targetSpectator ||
      spectator === enemy6.targetSpectator;

    if (!spectator.inCollisionWithHero && !isSpectatorTargeted) {
      const distance = Phaser.Math.Distance.Between(
        enemy1.x,
        enemy1.y,
        spectator.x,
        spectator.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpectator = spectator;
      }
    }
  });

  return closestSpectator;
}

// function findClosestSpectatorToEnemy3() {
//   let closestSpectator = null;
//   let closestDistance = Infinity;

//   spectators.forEach((spectator) => {
//     const isSpectatorTargeted =
//       spectator === enemy1.targetSpectator ||
//       spectator === enemy2.targetSpectator;

//     if (spectator.inCollisionWithHero && !isSpectatorTargeted) {
//       const distance = Phaser.Math.Distance.Between(
//         enemy3.x,
//         enemy3.y,
//         spectator.x,
//         spectator.y
//       );
//       if (distance < closestDistance) {
//         closestDistance = distance;
//         closestSpectator = spectator;
//       }
//     }
//   });

//   return closestSpectator;
// }
function findClosestSpectatorToEnemy3() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  spectators2.forEach((spectator2) => {
    const isSpectatorTargeted =
      spectator2 === enemy1.targetSpectator ||
      spectator2 === enemy2.targetSpectator;

    if (spectator2.inCollisionWithHero && !isSpectatorTargeted) {
      const distance = Phaser.Math.Distance.Between(
        enemy3.x,
        enemy3.y,
        spectator2.x,
        spectator2.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpectator = spectator2;
      }
    }
  });

  return closestSpectator;
}
function findClosestSpectatorToEnemy4() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  spectators.forEach((spectator) => {
    const isSpectatorTargeted =
      spectator === enemy1.targetSpectator ||
      spectator === enemy2.targetSpectator ||
      spectator === enemy3.targetSpectator;

    if (spectator.inCollisionWithHero && !isSpectatorTargeted) {
      const distance = Phaser.Math.Distance.Between(
        enemy4.x,
        enemy4.y,
        spectator.x,
        spectator.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpectator = spectator;
      }
    }
  });

  return closestSpectator;
}

function findClosestSpectatorToEnemy5() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  spectators.forEach((spectator) => {
    const isSpectatorTargeted =
      spectator === enemy1.targetSpectator ||
      spectator === enemy2.targetSpectator ||
      spectator === enemy3.targetSpectator ||
      spectator === enemy4.targetSpectator ||
      spectator === enemy6.targetSpectator;

    if (spectator.inCollisionWithHero && !isSpectatorTargeted) {
      const distance = Phaser.Math.Distance.Between(
        enemy5.x,
        enemy5.y,
        spectator.x,
        spectator.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpectator = spectator;
      }
    }
  });

  return closestSpectator;
}

function findClosestSpectatorToEnemy6() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  spectators.forEach((spectator) => {
    const isSpectatorTargeted =
      spectator === enemy1.targetSpectator ||
      spectator === enemy2.targetSpectator ||
      spectator === enemy3.targetSpectator ||
      spectator === enemy4.targetSpectator ||
      spectator === enemy5.targetSpectator;

    if (spectator.inCollisionWithHero && !isSpectatorTargeted) {
      const distance = Phaser.Math.Distance.Between(
        enemy6.x,
        enemy6.y,
        spectator.x,
        spectator.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpectator = spectator;
      }
    }
  });

  return closestSpectator;
}
function findClosestSpectatorForEnemy2() {
  let closestSpectator = null;
  let closestDistance = Infinity;

  spectators.forEach((spectator) => {
    if (
      !spectator.inCollisionWithEnemy2 &&
      !spectator.inCollisionWithEnemy1 &&
      !spectator.inCollisionWithEnemy3 &&
      !spectator.inCollisionWithEnemy4 &&
      !spectator.inCollisionWithEnemy5 &&
      !spectator.inCollisionWithEnemy6
    ) {
      const distance = Phaser.Math.Distance.Between(
        enemy2.x,
        enemy2.y,
        spectator.x,
        spectator.y
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpectator = spectator;
      }
    }
  });

  return closestSpectator;
}

function handleEnemy2Behavior() {
  const closestSpectator = findClosestSpectatorForEnemy2();
  if (closestSpectator) {
    enemy2.targetSpectator = closestSpectator;
    this.physics.moveToObject(enemy2, closestSpectator, enemy2.speed);
  } else {
    this.physics.moveToObject(enemy2, hero, enemy2.speed);
  }
}

function showNewRecordText(scene) {
  newRecordText.setVisible(true);
  game.scene.scenes[0].time.delayedCall(4000, () => {
    newRecordText.setVisible(false);
  });
}

function restartGame() {
  // Обновление Top Score
  if (score > topScore) {
    topScore = score;
    localStorage.setItem("topScore", topScore);
    localStorage.setItem("newRecord", "true"); // Установка флага нового рекорда
    topScoreText.setText("Top Score: " + topScore);
  }

  // Сброс текущих очков
  score = 0;
  scoreText.setText("Score: " + score);

  // Сброс здоровья
  health = 100;
  updateHealthBar();

  // Очистка зрителей и врагов
  spectators.forEach((spectator) => {
    if (spectator.sprite) {
      spectator.sprite.destroy();
    }
  });
  spectators.length = 0;

  enemy1.targetSpectator = null;
  enemy2.targetSpectator = null;
  enemy3.targetSpectator = null;

  // Перезапуск игры (перезапуск сцены)

  game.scene.scenes[0].scene.restart();
}
// Функция для рисования мест для зрителей
function drawSeats(startX, startY, rows, cols) {
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let x = startX + j * (seatWidth + seatGap);
      let y = startY + i * (seatHeight + seatGap + rowGap);
      graphics.fillStyle(0xc0c0c0, 1);
      graphics.fillRect(x, y, seatWidth, seatHeight);
    }
  }
}

// Функция поиска свободного места
function findFreeSeat() {
  for (let seat of seats) {
    if (!seat.occupied) {
      return seat;
    }
  }
  return null;
}
