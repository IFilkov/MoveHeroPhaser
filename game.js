// Сцена 1
const Scene1 = {
  key: "Scene1", // Добавляем ключ для идентификации
  preload: preload1,
  create: create1,
  update: update1,
};

// Сцена 2
const Scene2 = {
  key: "Scene2", // Добавляем ключ для идентификации
  preload: preload2,
  create: create2,
  update: update2,
};

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
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    gamepad: true,
  },
  scene: [Scene1, Scene2], // Обе сцены в конфиге, но запуск вручную
};

const game = new Phaser.Game(config);

// Явно запускаем только первую сцену
game.scene.start("Scene1");

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

let shuffledSeats = []; // Перемешанный массив мест
let spectatorsWithSeats = []; // Массив зрителей с назначенными местами

function preload1() {}

// Функция для создания мест и зрителей
function create1() {
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

  // Перемешиваем массив мест для случайного размещения зрителей
  shuffledSeats = Phaser.Utils.Array.Shuffle(seats);

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

function update1(time, delta) {
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

  // Обрабатываем перемещение зрителей к своим заранее назначенным местам
  spectatorsWithSeats.forEach(({ spectator, seat }, index) => {
    const dx = seat.x - spectator.x;
    const dy = seat.y - spectator.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Движение зрителя к своему месту
    if (distance > 1) {
      const angle = Math.atan2(dy, dx);
      spectator.x += Math.cos(angle) * spectatorSpeed * (delta / 1000);
      spectator.y += Math.sin(angle) * spectatorSpeed * (delta / 1000);
    } else {
      // Если зритель добрался до места, помечаем место как занятое
      seat.occupied = true;
      spectator.hasTakenSeat = true; // Устанавливаем флаг, что зритель занял место
      spectatorsWithSeats.splice(index, 1); // Убираем зрителя из списка перемещающихся
    }
  });

  // Функция проверки коллизий с circleBody
  spectators.forEach((spectator) => {
    if (!spectator.hasTakenSeat && checkCollision(circleBody, spectator)) {
      if (!collidedSpectators.includes(spectator)) {
        spectator.fillColor = 0x800080; // Перекрашиваем в фиолетовый при коллизии
        collidedSpectators.push(spectator); // Добавляем в список коллизий
        circleBodyCounter++; // Увеличиваем счётчик
        updateCounters(); // Обновляем текстовые объекты
      }
    }
  });

  // Функция проверки коллизий с enemy1
  spectators.forEach((spectator) => {
    const distance = Phaser.Math.Distance.Between(
      enemy1.x,
      enemy1.y,
      spectator.x,
      spectator.y
    );

    if (
      distance < seatRadius &&
      !enemyCollidedSpectators.has(spectator) &&
      !spectator.hasTakenSeat // Проверяем флаг hasTakenSeat
    ) {
      spectator.fillColor = 0x00ff00; // Перекрашиваем в зеленый
      enemyCollidedSpectators.add(spectator); // Добавляем зрителя в множество
      enemy1Counter++; // Увеличиваем счётчик для enemy1
      updateCounters(); // Обновляем текстовые объекты
    }
  });

  // Движение enemy1 к случайным зрителям
  moveEnemyToSpectator(delta);
  // Проверяем, заняли ли все зрители свои места и вызываем checkForWinner
  checkForWinner.call(this);
}

// Функция перемещения enemy1 к случайным зрителям
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
    (spectator) => !spectator.hasTakenSeat
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
    (spectator) =>
      !spectator.reachedSeat &&
      !excludedSpectators.has(spectator) &&
      !isSpectatorAtSeat(spectator) // Игнорируем зрителей, которые уже заняли свои места
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

  // Назначаем случайное место зрителю
  const assignedSeat = shuffledSeats.pop();

  // Добавляем флаг для отслеживания, занял ли зритель место
  spectator.hasTakenSeat = false;

  spectatorsWithSeats.push({ spectator, seat: assignedSeat });
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
    (spectator) => !spectator.hasTakenSeat
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
  for (let seat of shuffledSeats) {
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

// Функция для определения победителя и перезагрузки сцены
function checkForWinner() {
  const allSpectatorsSeated = spectators.every(
    (spectator) => spectator.hasTakenSeat
  );
  this.time.delayedCall(3000, () => {
    if (allSpectatorsSeated) {
      let winnerText;
      if (circleBodyCounter > enemy1Counter) {
        winnerText = "CircleBody win!";
      } else if (enemy1Counter > circleBodyCounter) {
        winnerText = "Enemy1 win!";
      } else {
        winnerText = "Draw!";
      }

      // Очищаем экран и выводим текст победителя
      this.cameras.main.fadeOut(1000); // Мягкое затемнение экрана
      this.time.delayedCall(1000, () => {
        this.cameras.main.fadeIn(1000);
        const winnerMessage = this.add.text(
          config.width / 2,
          config.height / 2,
          winnerText,
          { fontSize: "64px", fill: "#0000ff" }
        );
        winnerMessage.setOrigin(0.5, 0.5);
        // Запуск следующей сцены через 5 секунд
        this.time.delayedCall(5000, () => {
          this.scene.start("Scene2"); // Переход на сцену 2
          // console.log("Scene 2 actived");
        });
      });
    }
  });
}

// Глобальные переменные для рывка
let dashActive = false;
let dashCooldown = false;
let isDashing = false; // Флаг для отслеживания активного рывка
let dashStartTime = 0;
let dashDuration = 1000; // Продолжительность рывка в миллисекундах (1 секунда)
let dashCooldownDuration = 10000; // Кулдаун рывка в миллисекундах (10 секунд)
let normalSpeed = speed;
let dashMultiplier = 5; // Ускорение скорости в 5 раз

function preload2() {
  // Загрузка необходимых ресурсов для сцены 2 (если есть)
}

function create2() {
  // Создание объекта circleBody и прочая инициализация
  circleBody = this.add.circle(
    config.width / 2,
    config.height / 2,
    10,
    0x000000
  );
  this.physics.add.existing(circleBody);
  circleBody.body.setCollideWorldBounds(true);
  circleBody.body.setBounce(1, 1);

  lastDirectionChange = this.time.now;

  this.input.on("pointermove", (pointer) => {
    mousePos.x = pointer.x;
    mousePos.y = pointer.y;
  });

  this.input.gamepad.on("connected", (pad) => {
    gamepad = pad;
    console.log("Gamepad connected:", gamepad);
  });

  if (this.input.gamepad.total > 0) {
    gamepad = this.input.gamepad.getPad(0);
  }

  this.input.keyboard.on("keydown-SPACE", () => {
    if (controlMode === "autopilot") {
      controlMode = "mouse";
    } else {
      controlMode = "autopilot";
    }
  });

  // Обработка средней кнопки мыши для активации рывка
  this.input.on("pointerdown", (pointer) => {
    if (pointer.middleButtonDown()) {
      activateDash(this.time.now);
    }
  });

  // Включаем физику
  this.physics.world.setBounds(0, 0, config.width, config.height);

  // Запускаем появление зрителей
  startSpawningSpectators.call(this);

  // Добавляем коллайдер для обработки столкновений circleBody и зрителей
  this.physics.add.collider(
    circleBody,
    spectatorsGroup,
    handleCollision,
    null,
    this
  );
}

function update2(time, delta) {
  // Логика управления circleBody
  if (controlMode === "mouse") {
    moveToMouse(delta);
  } else if (controlMode === "gamepad" && gamepad) {
    moveWithGamepad(delta);
  } else {
    // moveRandomly(time, delta);
    moveToNearestSpectator.call(this);
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
  // Проверка кнопки B на геймпаде для активации рывка
  if (gamepad && gamepad.buttons[1].pressed && !dashActive && !dashCooldown) {
    activateDash(time);
  }

  // Логика завершения рывка через одну секунду
  if (dashActive && time - dashStartTime > dashDuration) {
    deactivateDash();
  }
}

// Функция активации рывка
function activateDash(currentTime) {
  if (!dashCooldown) {
    dashActive = true;
    dashStartTime = currentTime;
    speed = normalSpeed * dashMultiplier; // Увеличиваем скорость в 5 раз
    dashCooldown = true;

    // Устанавливаем таймер на отключение кулдауна через 10 секунд
    setTimeout(() => {
      dashCooldown = false;
    }, dashCooldownDuration);
  }
}

// Функция деактивации рывка
function deactivateDash() {
  dashActive = false;
  speed = normalSpeed; // Возвращаем обычную скорость
}

// Логика движения
function moveToMouse(delta) {
  const dx = mousePos.x - circleBody.x;
  const dy = mousePos.y - circleBody.y;
  const angle = Math.atan2(dy, dx);

  circleBody.x += Math.cos(angle) * speed * (delta / 1000);
  circleBody.y += Math.sin(angle) * speed * (delta / 1000);
}

function moveRandomly(time, delta) {
  if (
    !targetSpectator ||
    time - lastDirectionChange > changeDirectionTime ||
    targetSpectatorReached()
  ) {
    targetSpectator = getNewRandomSpectator();
    lastDirectionChange = time;
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
      targetSpectator = getNewRandomSpectator();
    }
  }
}

// let dashCooldown = true; // Изначально рывок доступен

function moveToNearestSpectator(forceMove = false) {
  // Если нет зрителей на экране или все уже обработаны, ничего не делаем
  const remainingSpectators = spectatorsGroup
    .getChildren()
    .filter((spectator) => !spectator.body.checkCollision.none);

  if (remainingSpectators.length === 0) {
    circleBody.body.setVelocity(0, 0); // Остановить движение, если зрителей не осталось
    return;
  }

  let nearestSpectator = null;
  let minDistance = Infinity;

  // Определяем ближайшего зрителя
  remainingSpectators.forEach((spectator) => {
    const distance = Phaser.Math.Distance.Between(
      circleBody.x,
      circleBody.y,
      spectator.x,
      spectator.y
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestSpectator = spectator;
    }
  });

  // Если нашли ближайшего зрителя или forceMove = true, перемещаемся к нему
  if (nearestSpectator) {
    const targetX = nearestSpectator.x;
    const targetY = nearestSpectator.y;

    // Вычисляем направление
    const directionX = targetX - circleBody.x;
    const directionY = targetY - circleBody.y;
    const magnitude = Math.sqrt(
      directionX * directionX + directionY * directionY
    );

    // Если рывок доступен (dashCooldown), увеличиваем скорость на 1 секунду
    if (dashCooldown) {
      const velocityX = (directionX / magnitude) * 1000; // Ускорение
      const velocityY = (directionY / magnitude) * 1000;
      circleBody.body.setVelocity(velocityX, velocityY);

      dashCooldown = false; // Блокируем рывок

      // Через 1 секунду возвращаем обычную скорость
      this.time.delayedCall(1000, () => {
        const normalVelocityX = (directionX / magnitude) * 200;
        const normalVelocityY = (directionY / magnitude) * 200;
        circleBody.body.setVelocity(normalVelocityX, normalVelocityY);
      });
    } else {
      // Обычная скорость движения
      const velocityX = (directionX / magnitude) * 200;
      const velocityY = (directionY / magnitude) * 200;
      circleBody.body.setVelocity(velocityX, velocityY);
    }

    // Таймер для разблокировки рывка каждые 10 секунд
    if (!dashCooldown) {
      this.time.delayedCall(10000, () => {
        dashCooldown = true;
      });
    }

    // Если forceMove = true, сразу переключаемся на следующего зрителя
    if (forceMove) {
      circleBody.once("stopped", () => {
        moveToNearestSpectator(false);
      });
    }
  }
}

function moveWithGamepad(delta) {
  const axisX = gamepad.axes[0].getValue();
  const axisY = gamepad.axes[1].getValue();

  circleBody.x += axisX * speed * (delta / 1000);
  circleBody.y += axisY * speed * (delta / 1000);

  if (circleBody.x <= 0 || circleBody.x >= config.width) {
    direction.x *= -1;
  }
  if (circleBody.y <= 0 || circleBody.y >= config.height) {
    direction.y *= -1;
  }
}

// function spawnSpectator() {
//   // Определяем случайную позицию появления по оси Y
//   const randomY = Phaser.Math.Between(100, config.height - 100);

//   // Создаем нового зрителя в левой части экрана
//   const spectator = this.add.sprite(0, randomY, "spectator");

//   // Устанавливаем круглый хитбокс, используя setSize и setOffset
//   const radius = spectator.width / 2;
//   // spectator.setSize(radius * 2, radius * 2); // Размер хитбокса как круг
//   // spectator.setOffset(-radius, -radius); // Смещаем хитбокс, чтобы он был в центре спрайта
//   spectator.setCircle(radius); // Используем метод setCircle для округлого хитбокса

//   // Устанавливаем скорость движения зрителя вправо
//   const speed = 100;

//   // Анимация движения зрителя
//   const moveTween = this.tweens.add({
//     targets: spectator,
//     x: config.width + 50, // Движется за пределы экрана
//     duration: (config.width / speed) * 1000, // Рассчитываем длительность, исходя из скорости
//     onComplete: function () {
//       spectator.destroy(); // Уничтожаем объект, когда он уйдет за экран
//     },
//   });
// }

// Обрабатываем столкновение circleBody со зрителями
function handleCollision(circleBody, spectator) {
  // Перекрашиваем зрителя в фиолетовый
  spectator.clear();
  spectator.fillStyle(0x800080, 1); // Фиолетовый цвет
  spectator.fillCircle(0, 0, 10); // Перерисовываем круг с новым цветом и тем же радиусом
  // Отключить коллизию с этим зрителем, чтобы не учитывать его в дальнейшем
  spectator.body.checkCollision.none = true;
}
function spawnSpectator() {
  // Определяем случайную позицию появления по оси Y
  const randomY = Phaser.Math.Between(100, config.height - 100);

  // Создаем графический объект зрителя
  const spectator = this.add.graphics();

  // Рисуем круг, представляющий зрителя
  const radius = 10;
  spectator.fillStyle(0x00ff00, 1);
  spectator.fillCircle(0, 0, radius);

  // Добавляем физику для графического объекта
  this.physics.add.existing(spectator);

  // Чтобы сделать его центрированным, смещаем относительно координат
  spectator.body.setCircle(radius, -radius, -radius);

  // Устанавливаем скорость движения зрителя вправо
  const speed = 100;

  spectatorsGroup.add(spectator); // Добавляем зрителя в группу

  // Устанавливаем позицию на экране
  spectator.setPosition(0, randomY);

  // Анимация движения зрителя
  this.tweens.add({
    targets: spectator,
    x: config.width + 50, // Движется за пределы экрана
    duration: (config.width / speed) * 1000, // Рассчитываем длительность, исходя из скорости
    onComplete: function () {
      spectator.destroy(); // Уничтожаем объект, когда он уйдет за экран
    },
  });
}

// Запуск функции появления зрителей каждую секунду
function startSpawningSpectators() {
  spectatorsGroup = this.physics.add.group(); // Группа для зрителей
  this.time.addEvent({
    delay: 1000, // Задержка в 1 секунду
    callback: spawnSpectator,
    callbackScope: this,
    loop: true, // Бесконечный цикл
  });
}
