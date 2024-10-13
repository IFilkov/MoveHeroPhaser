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

// Параметры для зрителей
const numRows = 20; // Количество рядов
const numSeatsPerRow = 20; // Количество мест в ряду
const seatSpacing = 30; // Расстояние между местами
const seatRadius = 10; // Радиус кружков-зрителей
const spectatorSpeed = 100; // Скорость перемещения зрителей
const spectatorInterval = 1000; // Интервал появления зрителей (в миллисекундах)

let spectators = []; // Массив для зрителей
let seats = []; // Массив для мест
let spectatorsToPlace = []; // Массив для зрителей, которым нужно занять место

// Переменные для игрового объекта и времени смены направления
let circleBody;
let direction = { x: 1, y: 1 };
let speed = 200; // скорость передвижения
let changeDirectionTime = 2000; // смена направления каждые 8 секунд
let lastDirectionChange = 0;
let controlMode = "autopilot"; // Режим управления: 'autopilot', 'mouse', 'gamepad'
let mousePos = { x: 0, y: 0 }; // Позиция курсора
let gamepad; // Переменная для геймпада
let isButtonPressed = false; // Флаг для отслеживания состояния кнопки A на геймпаде

// Переменные для отслеживания появления зрителей
let spectatorTimer = 0; // Время последнего появления зрителя
let spectatorsCreated = 0; // Количество созданных зрителей

// Добавляем массив для зрителей с коллизией
let collidedSpectators = [];
// Добавляем новую переменную для хранения целевого зрителя
let targetSpectator = null;
let enemyTargetSpectator = null; // Целевой зритель для enemy1

// Добавляем переменную для enemy1
let enemy1;
let enemySpeed = 200; // Скорость движения enemy1
let enemyCollidedSpectators = new Set(); // Множество для отслеживания зрителей, с которыми столкнулся enemy1

let circleBodyCounter = 0; // Счётчик для circleBody
let enemy1Counter = 0; // Счётчик для enemy1
let circleBodyText; // Текст для счётчика circleBody
let enemy1Text; // Текст для счётчика enemy1

function preload() {}

// Функция для создания мест и зрителей
function create() {
  // Создание графического объекта круга и физического тела
  circleBody = this.add.circle(
    config.width / 2,
    config.height / 2,
    10,
    0x000000
  );
  this.physics.add.existing(circleBody);
  circleBody.body.setCollideWorldBounds(true);
  circleBody.body.setBounce(1, 1);

  // Установка таймера для смены направления
  lastDirectionChange = this.time.now;

  // Создаем графический объект enemy1 (красный круг)
  enemy1 = this.add.circle(config.width / 4, config.height / 4, 10, 0xff0000);
  this.physics.add.existing(enemy1);

  // Обработчик нажатия пробела — переключение между автопилотом и управлением мышью
  this.input.keyboard.on("keydown-SPACE", () => {
    if (controlMode === "autopilot") {
      controlMode = "mouse";
    } else {
      controlMode = "autopilot";
    }
  });

  // Отслеживание позиции мыши
  this.input.on("pointermove", (pointer) => {
    mousePos.x = pointer.x;
    mousePos.y = pointer.y;
  });

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

  // Создаем текстовые объекты для счётчиков
  circleBodyText = this.add.text(10, config.height - 30, "CircleBody: 0", {
    fontSize: "20px",
    fill: "#00ff00",
  });
  enemy1Text = this.add.text(200, config.height - 30, "Enemy1: 0", {
    fontSize: "20px",
    fill: "#ff0000",
  });
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

function update(time, delta) {
  if (controlMode === "mouse") {
    moveToMouse(delta);
  } else if (controlMode === "gamepad" && gamepad) {
    moveWithGamepad(delta);
  } else {
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
  spectatorsToPlace.forEach((spectator, index) => {
    const targetSeat = findFreeSeat();

    if (targetSeat) {
      const dx = targetSeat.x - spectator.x;
      const dy = targetSeat.y - spectator.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Движение зрителя к свободному месту
      if (distance > 1) {
        const angle = Math.atan2(dy, dx);
        spectator.x += Math.cos(angle) * spectatorSpeed * (delta / 1000);
        spectator.y += Math.sin(angle) * spectatorSpeed * (delta / 1000);
      } else {
        // Если зритель добрался до места, помечаем место как занятое
        targetSeat.occupied = true;
        spectatorsToPlace.splice(index, 1); // Убираем зрителя из списка перемещающихся
      }
    }
  });

  // Проверяем коллизию circleBody со зрителями
  spectators.forEach((spectator) => {
    if (checkCollision(circleBody, spectator)) {
      if (!collidedSpectators.includes(spectator)) {
        spectator.fillColor = 0x800080; // Фиолетовый цвет для зрителя при коллизии
        collidedSpectators.push(spectator); // Добавляем зрителя в массив коллизий
        circleBodyCounter++; // Увеличиваем счётчик
        updateCounters(); // Обновляем текстовые объекты
      }
    }
  });

  // Движение enemy1 к случайным зрителям
  moveEnemyToSpectator(delta);

  // Проверяем коллизии enemy1 со зрителями
  spectators.forEach((spectator) => {
    const distance = Phaser.Math.Distance.Between(
      enemy1.x,
      enemy1.y,
      spectator.x,
      spectator.y
    );

    if (distance < seatRadius && !enemyCollidedSpectators.has(spectator)) {
      spectator.fillColor = 0x00ff00; // Перекрашиваем в зеленый
      enemyCollidedSpectators.add(spectator); // Добавляем зрителя в множество
      enemy1Counter++; // Увеличиваем счётчик для enemy1
      updateCounters(); // Обновляем текстовые объекты
    }
  });
}

// Функция перемещения enemy1 к случайным зрителям
// function moveEnemyToSpectator(delta) {
//   if (!enemyTargetSpectator || enemyReachedSpectator(enemyTargetSpectator)) {
//     // Если цели нет или цель достигнута, находим нового зрителя
//     enemyTargetSpectator = findRandomSpectator(enemyCollidedSpectators);
//   }

//   if (enemyTargetSpectator) {
//     const dx = enemyTargetSpectator.x - enemy1.x;
//     const dy = enemyTargetSpectator.y - enemy1.y;
//     const angle = Math.atan2(dy, dx);

//     enemy1.x += Math.cos(angle) * enemySpeed * (delta / 1000);
//     enemy1.y += Math.sin(angle) * enemySpeed * (delta / 1000);
//   }
// }
function moveEnemyToSpectator(delta) {
  if (!enemyTargetSpectator || enemyReachedSpectator(enemyTargetSpectator)) {
    // Если цели нет или цель достигнута, находим нового зрителя
    enemyTargetSpectator = getNewRandomSpectatorForEnemy();
  }

  if (enemyTargetSpectator) {
    const dx = enemyTargetSpectator.x - enemy1.x;
    const dy = enemyTargetSpectator.y - enemy1.y;
    const angle = Math.atan2(dy, dx);

    enemy1.x += Math.cos(angle) * enemySpeed * (delta / 1000);
    enemy1.y += Math.sin(angle) * enemySpeed * (delta / 1000);
  }
}

// Функция для получения нового случайного зрителя для enemy1, избегая зрителей, с которыми уже была коллизия или которые заняли места
function getNewRandomSpectatorForEnemy() {
  const availableSpectators = spectators.filter(
    (spectator) =>
      !enemyCollidedSpectators.has(spectator) && !isSpectatorAtSeat(spectator)
  );

  if (availableSpectators.length > 0) {
    return Phaser.Utils.Array.GetRandom(availableSpectators); // Возвращаем случайного зрителя, который подходит по условиям
  }

  return null; // Если таких зрителей нет, возвращаем null
}

// Функция проверки, достиг ли enemy1 своего текущего целевого зрителя
function enemyReachedSpectator(spectator) {
  const distance = Phaser.Math.Distance.Between(
    enemy1.x,
    enemy1.y,
    spectator.x,
    spectator.y
  );
  return distance <= seatRadius; // Если enemy1 достаточно близко к зрителю, цель достигнута
}

// Используем ту же функцию поиска случайного зрителя, исключая тех, кто уже столкнулся с enemy1
function findRandomSpectator(excludedSpectators) {
  const availableSpectators = spectators.filter(
    (spectator) => !spectator.reachedSeat && !excludedSpectators.has(spectator)
  );

  if (availableSpectators.length > 0) {
    return Phaser.Utils.Array.GetRandom(availableSpectators);
  }
  return null;
}

// Функция проверки коллизии
function checkCollision(circleBody, spectator) {
  const dx = spectator.x - circleBody.x;
  const dy = spectator.y - circleBody.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Проверка, меньше ли расстояние суммы радиусов объектов (10 для circleBody и seatRadius для зрителей)
  return distance < 10 + seatRadius;
}

// Функция создания одного зрителя
function createSpectator(scene) {
  const x = Phaser.Math.Between(config.width - 100, config.width - 50); // В правой части экрана
  const y = Phaser.Math.Between(50, config.height - 50); // Случайная высота

  // Создаем синий кружок как зрителя
  const spectator = scene.add.circle(x, y, seatRadius, 0x0000ff);
  spectators.push(spectator);
  spectatorsToPlace.push(spectator); // Добавляем в массив для размещения
}

// Функция перемещения к мыши
function moveToMouse(delta) {
  const dx = mousePos.x - circleBody.x;
  const dy = mousePos.y - circleBody.y;
  const angle = Math.atan2(dy, dx);

  circleBody.x += Math.cos(angle) * speed * (delta / 1000);
  circleBody.y += Math.sin(angle) * speed * (delta / 1000);
}

// Функция для перемещения к случайным зрителям, игнорируя тех, с которыми была коллизия или которые заняли свои места
function moveRandomly(time, delta) {
  if (
    !targetSpectator ||
    time - lastDirectionChange > changeDirectionTime ||
    targetSpectatorReached()
  ) {
    // Находим нового случайного зрителя, который еще не столкнулся с circleBody и не занял свое место
    targetSpectator = getNewRandomSpectator();
    lastDirectionChange = time; // Обновляем время последней смены цели
  }

  if (targetSpectator) {
    const dx = targetSpectator.x - circleBody.x;
    const dy = targetSpectator.y - circleBody.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1) {
      const angle = Math.atan2(dy, dx);
      circleBody.x += Math.cos(angle) * speed * (delta / 1000);
      circleBody.y += Math.sin(angle) * speed * (delta / 1000);
    } else {
      // Если circleBody достиг цели, выбираем нового случайного зрителя
      targetSpectator = getNewRandomSpectator();
    }
  }
}

// Функция для получения нового случайного зрителя
function getNewRandomSpectator() {
  const availableSpectators = spectators.filter(
    (spectator) =>
      !collidedSpectators.includes(spectator) && !isSpectatorAtSeat(spectator)
  );

  if (availableSpectators.length > 0) {
    return Phaser.Utils.Array.GetRandom(availableSpectators); // Возвращаем случайного зрителя, который подходит по условиям
  }

  return null; // Если таких зрителей нет, возвращаем null
}

// Функция для проверки, достиг ли зритель своего места

function isSpectatorAtSeat(spectator) {
  return seats.some((seat) => {
    const distance = Math.sqrt(
      (seat.x - spectator.x) ** 2 + (seat.y - spectator.y) ** 2
    );
    return distance < 1 && seat.occupied;
  });
}

// Функция для проверки, достиг ли circleBody своего текущего целевого зрителя
function targetSpectatorReached() {
  const dx = targetSpectator.x - circleBody.x;
  const dy = targetSpectator.y - circleBody.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= 1; // Если circleBody достаточно близко, считаем, что цель достигнута
}

// Функция перемещения с геймпада
function moveWithGamepad(delta) {
  const axisX = gamepad.axes[0].getValue(); // Горизонтальная ось (левый стик)
  const axisY = gamepad.axes[1].getValue(); // Вертикальная ось (левый стик)

  circleBody.x += axisX * speed * (delta / 1000);
  circleBody.y += axisY * speed * (delta / 1000);

  // Проверка границ экрана и отражение
  if (circleBody.x <= 0 || circleBody.x >= config.width) {
    direction.x *= -1;
  }
  if (circleBody.y <= 0 || circleBody.y >= config.height) {
    direction.y *= -1;
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

// Функция обновления текста счётчиков
function updateCounters() {
  circleBodyText.setText("CircleBody: " + circleBodyCounter);
  enemy1Text.setText("Enemy1: " + enemy1Counter);
}
