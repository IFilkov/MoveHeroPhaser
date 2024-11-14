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

// Сцена 3
const Scene3 = {
  key: "Scene3", // Добавляем ключ для идентификации
  preload: preload3,
  create: create3,
  update: update3,
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
  scene: [Scene1, Scene2, Scene3], // Обе сцены в конфиге, но запуск вручную
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

      // Запуск следующей сцены через 5 секунд
      this.time.delayedCall(5000, () => {
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
          this.time.delayedCall(5000, () => {
            this.scene.start("Scene2"); // Переход на сцену 2
            // console.log("Scene 2 actived");
          });
        });
      });
    }
  });
}

// Глобальные переменные для рывка
let dashActive = false;
let dashCooldown = false;
let dashStartTime = 0;
let dashDuration = 1000; // Продолжительность рывка в миллисекундах (1 секунда)
let dashCooldownDuration = 10000; // Кулдаун рывка в миллисекундах (10 секунд)
let normalSpeed = speed;
let dashMultiplier = 5; // Ускорение скорости в 5 раз

let circleBodyScore = 0;
let enemy2Score = 0;
let circleBodyScoreText;
let enemy2ScoreText;

let gameOver = false; // Флаг окончания игры

let circleBodySearching = true;

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

  // Создаём Enemy2 с аналогичной логикой как у circleBody
  enemy2 = this.add.circle(config.width / 2, config.height / 2, 10, 0xff6347);
  this.physics.add.existing(enemy2);
  // enemy2.body.setCollideWorldBounds(true);
  // enemy2.body.setBounce(1, 1);

  // Создание физического тела для enemy2
  this.physics.world.enable(enemy2);
  enemy2.body.setCircle(10); // Размер коллайдера (подбирай нужный радиус)

  lastDirectionChange = this.time.now;

  // Инициализация группы для прямоугольников
  rectanglesGroup = this.physics.add.group();

  // Добавляем прямоугольники на сцену каждую секунду
  this.time.addEvent({
    delay: 1000,
    callback: createRandomRectangle,
    callbackScope: this,
    loop: true,
  });

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

  // collisionDirection.call(this);
  // this.physics.world.on("worldstep", collisionDirection);

  // Добавляем коллайдер для обработки столкновений circleBody и зрителей
  this.physics.add.collider(
    circleBody,
    spectatorsGroup,
    handleCollision,
    // collisionDirection,
    null,
    this
  );

  // Создание коллизий для circleBody и Enemy2
  this.physics.add.collider(rectanglesGroup, circleBody, (rectangle) => {
    handleRectangleCollision(rectangle, circleBody);
  });

  this.physics.add.collider(rectanglesGroup, enemy2, (rectangle) => {
    handleRectangleCollision(rectangle, enemy2);
  });

  // Настраиваем коллизии для circleBody и enemy2 с группой зрителей
  this.physics.add.overlap(
    circleBody,
    spectatorsGroup,
    () => {
      handleSpectatorCollision(circleBody);
    },
    null,
    this
  );

  this.physics.add.overlap(
    enemy2,
    spectatorsGroup,
    () => {
      handleSpectatorCollision(enemy2);
    },
    null,
    this
  );

  circleBodyScoreText = this.add.text(16, config.height - 40, "CircleBody: 0", {
    fontSize: "32px",
    fill: "#0000FF",
  });
  enemy2ScoreText = this.add.text(300, config.height - 40, "Enemy2: 0", {
    fontSize: "32px",
    fill: "#FF0000",
  });

  winnerText = this.add
    .text(config.width / 2, config.height / 2, "", {
      fontSize: "32px",
      fill: "#FF0000",
    })
    .setOrigin(0.5);
  winnerText.setVisible(false);
}

function handleRectangleCollision(rectangle, target) {
  // Отключаем поиск зрителей при столкновении с прямоугольником
  if (target === circleBody) {
    circleBodySearching = false; // Остановить поиск
  }
  if (target === enemy2) {
    circleBodySearching = false; // Остановить поиск
  }

  // Отталкиваем circleBody или Enemy2 в правую сторону
  target.body.setVelocity(400, 0);
}

// function handleSpectatorCollision(target) {
//   // Проверка на победителя
//   if (circleBodyScore >= 20 || enemy2Score >= 20) {
//     gameOver = true;
//     const winner = circleBodyScore >= 20 ? "CircleBody" : "Enemy2";
//     showWinnerAndTransition(winner, this);
//   }
// }

function update2(time, delta) {
  // if (gameOver) {
  //   this.time.delayedCall(5000, () => {
  //     this.scene.start("Scene3"); // Имя следующей сцены
  //     return; // Остановить дальнейшее выполнение функции update2
  //   });
  //   // checkGameOver();
  // }
  // if (gameOver) {
  //   this.time.delayedCall(50000, () => {
  //     this.cameras.main.fadeOut(1000);
  //     // Запускаем мягкое затемнение экрана
  //     // Слушаем завершение fadeOut, после чего меняем сцену
  //   });
  //   this.scene.start("Scene3");
  // }
  // Проверяем наличие this перед вызовом checkGameOver
  console.log("Scene in update2:", this);
  checkGameOver(this);
  moveToNearestSpectatorForEnemy2.call(this);
  checkCollisionBetweenCircleBodyAndEnemy2();
  updateRectangles();

  // Проверяем коллизии и обновляем позиции
  rectanglesGroup.getChildren().forEach((rectangle) => {
    if (isOverlapping(rectangle, circleBody)) {
      handleRectangleCollision(rectangle, circleBody);
    }

    if (isOverlapping(rectangle, enemy2)) {
      handleRectangleCollision(rectangle, enemy2);
    }
  });

  // Проверка на достижение правого края экрана
  if (circleBody.x >= config.width - circleBody.width / 2) {
    // Вернуть флаг поиска зрителей в активное состояние
    circleBodySearching = true;
  }

  if (enemy2.x >= config.width - enemy2.width / 2) {
    // Вернуть флаг поиска зрителей в активное состояние
    circleBodySearching = true;
  }

  // Логика управления circleBody
  if (controlMode === "mouse") {
    moveToMouseScene2(delta);
  } else if (controlMode === "gamepad" && gamepad) {
    moveWithGamepadScene2(delta);
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

function isOverlapping(rectangle, target) {
  const rectX = rectangle.x;
  const rectY = rectangle.y;
  const rectWidth = rectangle.width; // Предположим, что вы храните ширину
  const rectHeight = rectangle.height; // Предположим, что вы храните высоту

  return (
    target.x < rectX + rectWidth &&
    target.x + target.width > rectX &&
    target.y < rectY + rectHeight &&
    target.y + target.height > rectY
  );
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
function moveToMouseScene2(delta) {
  if (!circleBodySearching) return; // Если флаг выключен, пропускаем поиск
  const dx = mousePos.x - circleBody.x;
  const dy = mousePos.y - circleBody.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 0) {
    const directionX = dx / distance;
    const directionY = dy / distance;

    // Нормализуем вектор скорости
    const velocityX = directionX * speed;
    const velocityY = directionY * speed;

    // Устанавливаем скорость для физического тела
    circleBody.body.setVelocity(velocityX, velocityY);
  }
}

function moveWithGamepadScene2(delta) {
  if (!circleBodySearching) return; // Если флаг выключен, пропускаем поиск
  const axisX = gamepad.axes[0].getValue();
  const axisY = gamepad.axes[1].getValue();

  // Вычисляем длину вектора (модуль)
  const magnitude = Math.sqrt(axisX * axisX + axisY * axisY);

  // Проверяем, что вектор не нулевой, чтобы избежать деления на 0
  if (magnitude > 0) {
    const normalizedX = axisX / magnitude;
    const normalizedY = axisY / magnitude;

    // Устанавливаем скорость для объекта с нормализованными значениями
    circleBody.body.setVelocity(normalizedX * speed, normalizedY * speed);
  } else {
    // Останавливаем объект, если джойстик в центре
    circleBody.body.setVelocity(0, 0);
  }
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

let baseSpeed = 150; // Базовая скорость
let speed2 = baseSpeed; // Текущая скорость
let lastDashTime = 0; // Время последнего ускорения

let baseSpeedEnemy2 = 190; // Базовая скорость
let speedEnemy2 = baseSpeed; // Текущая скорость
let lastDashTimeEnemy2 = 0; // Время последнего ускорения

// Функция для перемещения Enemy2 к ближайшему зрителю
function moveToNearestSpectatorForEnemy2() {
  if (!circleBodySearching) return; // Если флаг выключен, пропускаем поиск
  const remainingSpectators = spectatorsGroup
    .getChildren()
    .filter((spectator) => !spectator.body.checkCollision.none);

  if (remainingSpectators.length === 0) {
    enemy2.body.setVelocity(0, 0); // Остановить движение, если зрителей не осталось
    return;
  }

  let nearestSpectator = null;
  let minDistance = Infinity;

  remainingSpectators.forEach((spectator) => {
    const distance = Phaser.Math.Distance.Between(
      enemy2.x,
      enemy2.y,
      spectator.x,
      spectator.y
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestSpectator = spectator;
    }
  });

  if (nearestSpectator) {
    const targetX = nearestSpectator.x;
    const targetY = nearestSpectator.y;

    const directionX = targetX - enemy2.x;
    const directionY = targetY - enemy2.y;
    const magnitude = Math.sqrt(
      directionX * directionX + directionY * directionY
    );

    // const speed = 150;

    // Проверяем, прошло ли 10 секунд с момента последнего ускорения
    const currentTime = this.time.now; // Получаем текущее время игры
    if (currentTime - lastDashTimeEnemy2 > 12000) {
      // Если прошло более 10 секунд, увеличиваем скорость
      speedEnemy2 = baseSpeedEnemy2 * 4; // Ускоряем в два раза
      lastDashTimeEnemy2 = currentTime; // Обновляем время последнего ускорения

      // Через 1 секунду возвращаем обычную скорость
      this.time.delayedCall(1000, () => {
        speedEnemy2 = baseSpeedEnemy2; // Возвращаем базовую скорость
      });
    }
    const velocityX = (directionX / magnitude) * speedEnemy2;
    const velocityY = (directionY / magnitude) * speedEnemy2;

    enemy2.body.setVelocity(velocityX, velocityY);

    // Проверка коллизии по расстоянию
    if (minDistance < 10) {
      // Если враг близко к зрителю
      nearestSpectator.clear();
      nearestSpectator.fillStyle(0x008080, 1); // Голубой цвет
      nearestSpectator.fillCircle(0, 0, 12);
      // Увеличение очков для enemy2
      enemy2Score += 1;
      enemy2ScoreText.setText("Enemy2: " + enemy2Score);
      nearestSpectator.body.checkCollision.none = true; // Отключаем коллизию
    }
  }
}

function moveToNearestSpectator() {
  if (!circleBodySearching) return; // Если флаг выключен, пропускаем поиск
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

  // Если нашли ближайшего зрителя, или forceMove = true, перемещаемся к нему
  if (nearestSpectator) {
    const targetX = nearestSpectator.x;
    const targetY = nearestSpectator.y;

    // Вычисляем направление
    const directionX = targetX - circleBody.x;
    const directionY = targetY - circleBody.y;
    const magnitude = Math.sqrt(
      directionX * directionX + directionY * directionY
    );

    // Проверяем, прошло ли 10 секунд с момента последнего ускорения
    const currentTime = this.time.now; // Получаем текущее время игры
    if (currentTime - lastDashTime > 10000) {
      // Если прошло более 10 секунд, увеличиваем скорость
      speed2 = baseSpeed * 4; // Ускоряем в два раза
      lastDashTime = currentTime; // Обновляем время последнего ускорения

      // Через 1 секунду возвращаем обычную скорость
      this.time.delayedCall(1000, () => {
        speed2 = baseSpeed; // Возвращаем базовую скорость
      });
    }

    // Задаем скорость движения
    const velocityX = (directionX / magnitude) * speed2;
    const velocityY = (directionY / magnitude) * speed2;

    // Устанавливаем скорость в сторону ближайшего зрителя
    circleBody.body.setVelocity(velocityX, velocityY);
  }
}

// Обрабатываем столкновение circleBody со зрителями
function handleCollision(circleBody, spectator) {
  // Перекрашиваем зрителя в фиолетовый
  spectator.clear();
  spectator.fillStyle(0x800080, 1); // Фиолетовый цвет
  spectator.fillCircle(0, 0, 12); // Перерисовываем круг с новым цветом и тем же радиусом
  // Увеличение очков для circleBody
  circleBodyScore += 1;
  circleBodyScoreText.setText("CircleBody: " + circleBodyScore);
  // Отключить коллизию с этим зрителем, чтобы не учитывать его в дальнейшем
  spectator.body.checkCollision.none = true;
}

// Пересечение circleBody c enemy2
function checkCollisionBetweenCircleBodyAndEnemy2() {
  const circleBodyBounds = new Phaser.Geom.Circle(
    circleBody.x,
    circleBody.y,
    circleBody.radius
  );
  const enemy2Bounds = new Phaser.Geom.Circle(
    enemy2.x,
    enemy2.y,
    enemy2.radius
  );

  // Проверяем пересечение окружностей circleBody и Enemy2
  if (Phaser.Geom.Intersects.CircleToCircle(circleBodyBounds, enemy2Bounds)) {
    console.log("HIT!");

    const dx = circleBody.x - enemy2.x;
    const dy = circleBody.y - enemy2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const normX = dx / distance;
      const normY = dy / distance;

      // Увеличиваем величину отскока
      const bounceMultiplier = 5.5; // Настраиваем коэффициент отскока
      const baseSpeed = Phaser.Math.Between(80, 200);

      const velocityX1 = normX * baseSpeed * bounceMultiplier;
      const velocityY1 = normY * baseSpeed * bounceMultiplier;
      const velocityX2 = -normX * baseSpeed * bounceMultiplier;
      const velocityY2 = -normY * baseSpeed * bounceMultiplier;

      // Устанавливаем скорости для отскока
      circleBody.body.setVelocity(velocityX1, velocityY1);
      enemy2.body.setVelocity(velocityX2, velocityY2);
    }
  }
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
  // const speed = 100;

  // Задаем случайную скорость
  const speed = Phaser.Math.Between(80, 140);
  spectator.body.setVelocityX(speed);

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
    delay: 500, // Задержка в 1 секунду
    callback: spawnSpectator,
    callbackScope: this,
    loop: true, // Бесконечный цикл
  });
}

// Группа для оранжевых прямоугольников
let rectanglesGroup;

function createRandomRectangle() {
  // Создаем оранжевый прямоугольник
  const rectangle = this.add.graphics({ fillStyle: { color: 0xffa500 } });
  rectangle.fillRect(0, 0, 50, 20);
  rectangle.x = Phaser.Math.Between(0, 100); // Случайное положение по X (левая часть экрана)
  rectangle.y = Phaser.Math.Between(50, config.height - 50); // Случайное положение по Y
  rectangle.speed = 200; // Скорость прямоугольника

  // Добавляем прямоугольник в группу
  rectanglesGroup.add(rectangle);

  // Включаем физику для графического объекта
  this.physics.world.enable(rectangle);
  rectangle.body.velocity.x = rectangle.speed;
}

function updateRectangles() {
  rectanglesGroup.getChildren().forEach((rectangle) => {
    // Перемещение вправо
    rectangle.x += rectangle.speed / 60; // Скорость перемещения без учета дельты времени
    rectangle.body.immovable = true; // Делает rectangle "неподвижным"
    rectangle.body.checkCollision.none = false;
    // Проверка на выход за экран
    if (rectangle.x > config.width) {
      rectangle.destroy(); // Удаляем прямоугольник, если он вышел за пределы экрана
    }

    // Проверяем столкновения с каждым зрителем
    spectatorsGroup.getChildren().forEach((spectator) => {
      const distance = Phaser.Math.Distance.Between(
        rectangle.x,
        rectangle.y,
        spectator.x,
        spectator.y
      );
      // Если прямоугольник слишком близко к зрителю, смещаем его, чтобы избежать коллизии
      if (distance < 50) {
        // Смещение прямоугольника в сторону, чтобы избежать коллизии
        // rectangle.y += 20;
        const direction = Math.random() < 0.5 ? -1 : 1;

        // Смещаем rectangle вверх или вниз на 20 пикселей
        rectangle.y += 20 * direction;
      }
    });
  });
}
function handleSpectatorCollision() {
  //Проверка на победителя
  if (circleBodyScore >= 2 || enemy2Score >= 2) {
    gameOver = true;
    const winner = circleBodyScore >= 2 ? "CircleBody" : "Enemy2";
    showWinnerAndTransition(winner);
  }
}

function checkGameOver(scene) {
  if (circleBodyScore >= 2 || enemy2Score >= 2) {
    scene.cameras.main.fadeOut(500);
    gameOver = true;
    const winner = circleBodyScore >= 2 ? "CircleBody" : "Enemy2";

    scene.time.delayedCall(5000, () => {
      scene.cameras.main.fadeOut(1000);
      scene.time.delayedCall(1000, () => {
        scene.cameras.main.fadeIn(1000);
        showWinnerAndTransition(winner, scene);
        scene.time.delayedCall(1000, () => {
          scene.scene.start("Scene3");
        });
      });
    });
  }
}

function showWinnerAndTransition(winner, scene) {
  winnerText.setText(`${winner} Wins!`);
  winnerText.setVisible(true);
}

// Scene3
const roadMargin = 300; // отступ от края экрана до линий
function createRoadLines(scene) {
  const lineWidth = 6; // ширина линий
  // Левая линия
  scene.add.rectangle(
    roadMargin,
    scene.scale.height / 2,
    lineWidth,
    scene.scale.height,
    0x000000 // цвет линии (черный)
  );
  // Правая линия
  scene.add.rectangle(
    scene.scale.width - roadMargin,
    scene.scale.height / 2,
    lineWidth,
    scene.scale.height,
    0x000000 // цвет линии (черный)
  );
}
let pioples = []; // Массив для хранения pioples
const piopleSpeed = Phaser.Math.Between(80, 150);
// Функция для появления нового piople
function spawnPiople(scene) {
  const xPosition = Phaser.Math.Between(
    roadMargin,
    scene.scale.width - roadMargin
  );
  const piople = scene.add.circle(xPosition, 0, 10, 0x00ff00); // Зеленый круг
  scene.physics.add.existing(piople);
  const piopleSpeed = Phaser.Math.Between(80, 150);
  piople.body.setVelocityY(piopleSpeed); // Устанавливаем вертикальную скорость
  pioples.push(piople); // Добавляем в массив
}
// Функция для поиска первого свободного места
function findFreeSpot(spots) {
  return spots.find((spot) => !spot.occupied);
}
// Добавляем флаг для каждого piople, чтобы исключить повторную обработку
pioples.forEach((piople) => {
  piople.hasCollided = false;
});
// Функция обработки коллизий для piople
function handlePiopleCollision(piople, scene, spots) {
  if (piople.hasCollided) return; // Проверка, что коллизия обрабатывается только один раз
  occupiedPioples.delete(piople); // Освобождаем место после столкновения
  piople.hasCollided = true; // Устанавливаем флаг для предотвращения повторного вызова
  piople.body.setVelocity(0); // Останавливаем piople
  // Проверяем, есть ли body у piople
  if (!piople.body) return;
  // Двухсекундная задержка перед выбором действия
  scene.time.delayedCall(1000, () => {
    if (!piople.body) return;
    const shouldTakeSpot = Math.random() < 0.5; // Случайное решение для каждого piople
    if (shouldTakeSpot) {
      // Используем функцию для поиска свободного места
      const freeSpot = findFreeSpot(spots);
      if (freeSpot) {
        freeSpot.occupied = true; // Помечаем место как занятое только при выборе занять его
        piople.setFillStyle(0x0000ff); // Перекрашиваем в синий

        console.log(`Место занято: (${freeSpot.x}, ${freeSpot.y})`); // Выводим занятое место в консоль

        // Направляем piople к свободному месту с уменьшенной скоростью
        const dx = freeSpot.x - piople.x;
        const dy = freeSpot.y - piople.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const adjustedSpeed = piopleSpeed * 0.75; // Уменьшенная скорость для более точного перемещения

        if (piople.body) {
          piople.body.setVelocity(
            (dx / distance) * adjustedSpeed,
            (dy / distance) * adjustedSpeed
          );
        }

        // Проверка на достижение места
        const checkArrival = scene.time.addEvent({
          delay: 50,
          callback: () => {
            if (!piople.body) {
              checkArrival.remove(); // Прекращаем проверку, если body больше нет
              return;
            }
            // Расширенная проверка прибытия, учитывающая небольшое расстояние до координат места
            if (
              Math.abs(piople.x - freeSpot.x) < 4 &&
              Math.abs(piople.y - freeSpot.y) < 4
            ) {
              piople.body.setVelocity(0); // Останавливаем piople на месте
              checkArrival.remove(); // Удаляем событие
            }
          },
          loop: true,
        });
      } else {
        // Если свободных мест нет, piople продолжает движение вниз
        // piople.body.setVelocityY(piopleSpeed);
        if (piople.body) {
          piople.body.setVelocityY(piopleSpeed); // Вертикальная скорость вниз
        }
      }
    } else {
      // Если piople выбирает продолжить движение вниз, остаётся зелёным
      piople.setFillStyle(0x00ff00);
      // piople.body.setVelocity(0, piopleSpeed); // Двигается строго вниз
      if (piople.body) {
        piople.body.setVelocityY(piopleSpeed);
      }
    }
  });
}
const topMargin = 50; // Отступ от верхней границы экрана
const rowSpacing = 30; // Расстояние между кружками по вертикали
const numCirclesPerColumn = 20; // Число кружков в каждом ряду
const leftColumnXPositions = [50, 80, 110, 140, 170, 200]; // Позиции x для левых рядов
const rightColumnXPositions = [
  config.width - 50,
  config.width - 80,
  config.width - 110,
  config.width - 140,
  config.width - 170,
  config.width - 200,
]; // Позиции x для правых рядов
const reservedSpotsLeft = []; // Массив для хранения серых кружков слева
const reservedSpotsRight = []; // Массив для хранения серых кружков справа

function createReservedSpots(scene) {
  // Создаем ряды слева
  leftColumnXPositions.forEach((xPos) => {
    for (let i = 0; i < numCirclesPerColumn; i++) {
      const y = topMargin + i * rowSpacing;
      const reservedSpot = scene.add.circle(xPos, y, 10, 0x808080);
      reservedSpot.occupied = false;
      reservedSpotsLeft.push(reservedSpot);
    }
  });
  // Создаем ряды справа
  rightColumnXPositions.forEach((xPos) => {
    for (let i = 0; i < numCirclesPerColumn; i++) {
      const y = topMargin + i * rowSpacing;
      const reservedSpot = scene.add.circle(xPos, y, 10, 0x808080);
      reservedSpot.occupied = false;
      reservedSpotsRight.push(reservedSpot);
    }
  });
}
// Создание массива для хранения agitator
let agitators = [];
let agitatorActive = false;
let currentAgitator = null;
let agitatorCollidedWithCircleBody = false; // Сброс флага для circleBody
let agitatorCollidedWithEnemy3 = false; // Сброс флага для enemy3
// Функция для появления agitator
function spawnAgitator(scene) {
  agitatorCollidedWithCircleBody = false; // Сброс флага
  agitatorCollidedWithEnemy3 = false;
  const xPosition = Phaser.Math.Between(
    roadMargin,
    scene.scale.width - roadMargin
  );
  const agitator = scene.add.circle(xPosition, 0, 10, 0x800080); // Фиолетовый agitator
  scene.physics.add.existing(agitator);
  agitator.body.setVelocityY(100); // Движется вниз
  agitators.push(agitator); // Добавляем в массив
  agitatorActive = true;
  currentAgitator = agitator;
  // Обновляем цели для circleBody и enemy3
  updateTargetForCircleBody();
  updateTargetForEnemy3();

  scene.time.delayedCall(8000, () => {
    agitator.destroy();
    agitatorActive = false;
    currentAgitator = null;
  });
}
function updateTargetForCircleBody() {
  if (agitatorActive) {
    moveToTarget(circleBody, circleBodySpeed);
  } else {
    moveToClosestPiople(circleBody, pioples, speed);
  }
}
function updateTargetForEnemy3() {
  if (agitatorActive && currentAgitator) {
    moveToTarget(enemy3, enemy3Speed);
  } else {
    moveEnemy3ToClosestPiople(speed);
  }
}
// Таймер для появления agitator каждые 10 секунд
function startAgitatorSpawnTimer(scene) {
  scene.time.addEvent({
    delay: 20000, // 10 секунд
    callback: () => spawnAgitator(scene),
    loop: true,
  });
}
// Движение к Агитатору
function moveToTarget(circleBody, speed) {
  if (currentAgitator) {
    // Проверка на коллизию agitator с circleBody
    if (!agitatorCollidedWithCircleBody && !agitatorCollidedWithEnemy3) {
      const dx = currentAgitator.x - circleBody.x;
      const dy = currentAgitator.y - circleBody.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      circleBody.body.setVelocity(
        (dx / distance) * speed,
        (dy / distance) * speed
      );

      // Проверка на коллизию с circleBody
      if (Phaser.Geom.Intersects.CircleToCircle(circleBody, currentAgitator)) {
        agitatorCollidedWithCircleBody = true; // Устанавливаем флаг
        circleBody.body.setVelocity(0); // Останавливаем circleBody при коллизии
        enemy3.body.setVelocity(0); // Останавливаем enemy3
      }
    }

    // Проверка на коллизию с enemy3, если agitator ещё активен
    if (!agitatorCollidedWithCircleBody && !agitatorCollidedWithEnemy3) {
      const dxEnemy3 = currentAgitator.x - enemy3.x;
      const dyEnemy3 = currentAgitator.y - enemy3.y;
      const distanceEnemy3 = Math.sqrt(
        dxEnemy3 * dxEnemy3 + dyEnemy3 * dyEnemy3
      );
      enemy3.body.setVelocity(
        (dxEnemy3 / distanceEnemy3) * speed,
        (dyEnemy3 / distanceEnemy3) * speed
      );

      // Проверка на коллизию с enemy3
      if (Phaser.Geom.Intersects.CircleToCircle(enemy3, currentAgitator)) {
        agitatorCollidedWithEnemy3 = true; // Устанавливаем флаг
        enemy3.body.setVelocity(0); // Останавливаем enemy3 при коллизии
        circleBody.body.setVelocity(0); // Останавливаем circleBody
      }
    }
  }
}
function preload3() {}
let enemy3; // Переменная для enemy3
function create3() {
  this.cameras.main.fadeOut(1000);
  this.cameras.main.fadeIn(1000);
  console.log("Scene3 active");
  createReservedSpots(this); // Создаем ряды серых кружков
  createRoadLines(this); // вызываем функцию для отрисовки линий
  startAgitatorSpawnTimer(this); // Запускаем таймер
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

  // Создаем enemy3 как красный круг и включаем физику
  enemy3 = this.add.circle(100, 100, 10, 0xd2691e); // Позиция может быть любой начальной
  this.physics.add.existing(enemy3);

  // Добавляем коллизию между enemy3 и pioples
  this.physics.add.overlap(enemy3, pioples, handleEnemy3CollisionWithPiople);

  // Коллизии между circleBody и agitator
  this.physics.add.overlap(circleBody, agitators, (circleBody, agitator) => {
    agitatorCollidedWithCircleBody = true;
    handleCircleBodyAgitatorCollision(circleBody, agitator);
  });

  // Коллизии между enemy3 и agitator
  this.physics.add.overlap(enemy3, agitators, (enemy3, agitator) => {
    handleEnemy3AgitatorCollision(enemy3, agitator);
  });

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
  createRoadLines(this);
  this.time.addEvent({
    delay: 500, // Интервал появления (можно регулировать)
    callback: () => spawnPiople(this),
    loop: true,
  });
}
// Массив для хранения piople, с которыми была коллизия
let ignorePioples = [];
let isStopped = false; // Флаг для отслеживания состояния остановки
let occupiedPioples = new Set();

function findClosestPiople(circleBody, pioples) {
  let closestPiople = null;
  let minDistance = Infinity;
  pioples.forEach((piople) => {
    // Пропускаем `piople`, если он находится в `ignorePioples`
    if (ignorePioples.includes(piople)) return;
    const distance = Phaser.Math.Distance.Between(
      circleBody.x,
      circleBody.y,
      piople.x,
      piople.y
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestPiople = piople;
    }
  });
  return closestPiople;
}
function moveToClosestPiople(circleBody, pioples, speed) {
  if (isStopped) return; // Если остановлен, не двигаем circleBody
  if (agitatorActive && currentAgitator) {
    // Если agitator активен, движемся к нему
    moveToTarget(circleBody, speed);
  } else {
    const target = findClosestPiople(circleBody, pioples);
    if (target) {
      const dx = target.x - circleBody.x;
      const dy = target.y - circleBody.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // Устанавливаем скорость в направлении ближайшего `piople`
      circleBody.body.setVelocity(
        (dx / distance) * speed,
        (dy / distance) * speed
      );
      // Теперь, когда движение начато, добавляем цель в occupiedPioples
      occupiedPioples.add(target);
      // Проверяем коллизии и добавляем `piople` в `ignorePioples`
      if (Phaser.Geom.Intersects.CircleToCircle(circleBody, target)) {
        ignorePioples.push(target); // Добавляем в игнорируемые объекты
        // Останавливаем circleBody на 1 секунду
        circleBody.body.setVelocity(0);
        isStopped = true;
        // Таймер для возобновления движения
        circleBody.scene.time.delayedCall(1000, () => {
          isStopped = false; // Снимаем остановку
        });
      }
    }
  }
}
let circleBodySpeed = 300;
let enemy3Speed = 300;
// Переменная для отслеживания задержки
let isCircleBodyDelayed = false;
// Функция для обработки задержки при коллизии
function delayAfterCollision(circleBody, scene) {
  isCircleBodyDelayed = true;
  circleBody.body.setVelocity(0); // Останавливаем движение
  // Устанавливаем таймер на 1 секунду
  circleBody.scene.time.delayedCall(200, () => {
    isCircleBodyDelayed = false; // Снимаем задержку через 1 секунду
  });
}
// Функция для поиска ближайшего piople к enemy3
function findClosestPiopleToEnemy3() {
  let closestPiople = null;
  let minDistance = Infinity;

  pioples.forEach((piople) => {
    if (ignorePioples.includes(piople)) return;
    const distance = Phaser.Math.Distance.Between(
      enemy3.x,
      enemy3.y,
      piople.x,
      piople.y
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestPiople = piople;
    }
  });
  return closestPiople;
}
// Функция для перемещения enemy3 к ближайшему piople
function moveEnemy3ToClosestPiople(speed) {
  if (isStopped) return;
  if (agitatorActive && currentAgitator) {
    // Если agitator активен, движемся к нему
    moveToTarget(enemy3, speed);
  } else {
    const target = findClosestPiopleToEnemy3();
    if (target) {
      const dx = target.x - enemy3.x;
      const dy = target.y - enemy3.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // Устанавливаем скорость в направлении ближайшего piople
      enemy3.body.setVelocity((dx / distance) * speed, (dy / distance) * speed);
      // Проверяем коллизии и добавляем `piople` в `ignorePioples`
      if (Phaser.Geom.Intersects.CircleToCircle(enemy3, target)) {
        ignorePioples.push(target); // Добавляем в игнорируемые объекты
        // Останавливаем enemy3 на 1 секунду
        enemy3.body.setVelocity(0);
        isStopped = true;
        // Таймер для возобновления движения
        enemy3.scene.time.delayedCall(1000, () => {
          isStopped = false; // Снимаем остановку
        });
      }
    }
  }
}
// Функция для обработки коллизий enemy3 с piople
function handleEnemy3CollisionWithPiople(enemy, piople) {
  if (piople.hasCollided) return; // Проверка, что коллизия обрабатывается только один раз
  piople.hasCollided = true;
  occupiedPioples.delete(piople); // Освобождаем место после столкновения
  console.log("Check");
  // Проверяем, есть ли body у piople
  if (!piople.body) return;
  // Останавливаем piople на 2 секунды при столкновении
  piople.body.setVelocity(0);
  enemy.scene.time.delayedCall(1000, () => {
    if (!piople.body) return;
    // Генерация случайного решения: занять место или продолжить движение вниз
    const shouldTakeSpot = Math.random() < 0.5;
    if (shouldTakeSpot) {
      // Ищем первое свободное место справа
      const freeSpot = reservedSpotsRight.find((spot) => !spot.occupied);
      if (freeSpot) {
        // Если свободное место найдено, piople перекрашивается в синий и движется к месту
        piople.setFillStyle(0xff0000);
        freeSpot.occupied = true; // Помечаем место как занятое
        // Направление движения к месту
        const dx = freeSpot.x - piople.x;
        const dy = freeSpot.y - piople.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Проверяем наличие body перед установкой скорости
        if (piople.body) {
          piople.body.setVelocity(
            (dx / distance) * piopleSpeed,
            (dy / distance) * piopleSpeed
          );
        }
        // Проверяем, достиг ли piople свободного места
        const checkArrival = enemy.scene.time.addEvent({
          delay: 50,
          callback: () => {
            if (!piople.body) {
              checkArrival.remove(); // Прекращаем проверку, если body больше нет
              return;
            }
            const reachedX = Math.abs(piople.x - freeSpot.x) < 4;
            const reachedY = Math.abs(piople.y - freeSpot.y) < 4;
            if (reachedX && reachedY) {
              piople.body.setVelocity(0); // Останавливаем piople
              checkArrival.remove(); // Очищаем событие
            }
          },
          loop: true,
        });
      } else {
        // Если свободных мест нет, piople продолжает движение вниз
        piople.setFillStyle(0x00ff00); // Возвращаем цвет
        piople.body.setVelocity(0, piopleSpeed); // Вертикальная скорость вниз
      }
    } else {
      // Если piople выбирает продолжить движение вниз, остаётся зелёным и движется вниз
      piople.setFillStyle(0x00ff00);
      piople.body.setVelocity(0, piopleSpeed);
    }
  });
}
// Функция для поиска и перемещения к ближайшим pioples
function startAgitatorTargetingPioples(agitator, pioples) {
  const closestPioples = findClosestPioples(agitator, pioples).slice(0, 5); // Находим 5 ближайших pioples
  // Настраиваем agitator для движения к ближайшим pioples
  closestPioples.forEach((piople, index) => {
    // Добавляем задержку между движениями к каждой цели
    agitator.scene.time.delayedCall(index * 800, () => {
      if (!agitator.active) return; // Проверка, не уничтожен ли agitator
      const dx = piople.x - agitator.x;
      const dy = piople.y - agitator.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      agitator.body.setVelocity((dx / distance) * 400, (dy / distance) * 400);
    });
  });
  // Устанавливаем таймер для уничтожения agitator через 4 секунды
  agitator.scene.time.delayedCall(4000, () => {
    if (agitator.active) {
      agitator.destroy();
    }
  });
}
// Функция для обработки коллизии circleBody с agitator
function handleCircleBodyAgitatorCollision(circleBody, agitator) {
  console.log("AgentHero");
  // agitator.destroy(); // Уничтожаем agitator после коллизии (если требуется)
  startAgitatorTargetingPioples(agitator, pioples); // Запускаем поиск ближайших pioples
}
// Функция для обработки коллизии enemy3 с agitator
function handleEnemy3AgitatorCollision(enemy3, agitator) {
  console.log("AgentEnemy");
  // agitator.destroy(); // Уничтожаем agitator после коллизии (если требуется)
  startAgitatorTargetingPioples(agitator, pioples); // Запускаем поиск ближайших pioples
}
// Функция поиска ближайших pioples
function findClosestPioples(agitator, pioples) {
  // Сортируем pioples по расстоянию до agitator
  const distances = pioples.map((piople) => {
    const distance = Phaser.Math.Distance.Between(
      agitator.x,
      agitator.y,
      piople.x,
      piople.y
    );
    return { piople, distance };
  });
  // Возвращаем массив pioples, отсортированный по расстоянию
  return distances
    .sort((a, b) => a.distance - b.distance)
    .map((entry) => entry.piople);
}
function update3(time, delta, scene) {
  checkCollisions(this);
  // Логика управления circleBody
  if (controlMode === "mouse") {
    moveToMouseScene3(delta);
  } else if (controlMode === "gamepad" && gamepad) {
    moveWithGamepadScene3(delta);
  } else {
    moveToClosestPiople(circleBody, pioples, 211); // указываем скорость, например 100
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
  // Перемещаем каждый объект в массиве вниз по экрану
  pioples.forEach((piople, index) => {
    if (piople.y > config.height) {
      piople.destroy(); // Удаляем объект, если он вышел за пределы экрана
      pioples.splice(index, 1); // Убираем из массива
    }
  });
  // Проверка на столкновение circleBody с каждым piople
  pioples.forEach((piople) => {
    if (
      Phaser.Geom.Intersects.CircleToCircle(circleBody, piople) &&
      !isCircleBodyDelayed
    ) {
      delayAfterCollision(circleBody, scene);
    }
  });
  moveEnemy3ToClosestPiople(200); // Устанавливаем желаемую скорость
}
function checkCollisions(scene) {
  pioples.forEach((piople) => {
    if (
      !piople.hasCollided &&
      Phaser.Geom.Intersects.CircleToCircle(circleBody, piople, enemy3)
    ) {
      handlePiopleCollision(piople, scene, reservedSpotsLeft);
      lastCollisionTime = scene.time.now; // Обновляем время последней коллизии
    }
  });
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
function moveToMouseScene3(delta) {
  // if (!circleBodySearching) return; // Если флаг выключен, пропускаем поиск
  if (!isCircleBodyDelayed) {
    const dx = mousePos.x - circleBody.x;
    const dy = mousePos.y - circleBody.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0) {
      const directionX = dx / distance;
      const directionY = dy / distance;
      // Нормализуем вектор скорости
      const velocityX = directionX * speed;
      const velocityY = directionY * speed;
      // Устанавливаем скорость для физического тела
      circleBody.body.setVelocity(velocityX, velocityY);
    }
  }
}
function moveWithGamepadScene3(delta) {
  if (!isCircleBodyDelayed && gamepad) {
    // if (!circleBodySearching) return; // Если флаг выключен, пропускаем поиск
    const axisX = gamepad.axes[0].getValue();
    const axisY = gamepad.axes[1].getValue();
    // Вычисляем длину вектора (модуль)
    const magnitude = Math.sqrt(axisX * axisX + axisY * axisY);
    // Проверяем, что вектор не нулевой, чтобы избежать деления на 0
    if (magnitude > 0) {
      const normalizedX = axisX / magnitude;
      const normalizedY = axisY / magnitude;
      // Устанавливаем скорость для объекта с нормализованными значениями
      circleBody.body.setVelocity(normalizedX * speed, normalizedY * speed);
    } else {
      // Останавливаем объект, если джойстик в центре
      circleBody.body.setVelocity(0, 0);
    }
  }
}

// let baseSpeed = 150; // Базовая скорость
// let speed2 = baseSpeed; // Текущая скорость
// let lastDashTime = 0; // Время последнего ускорения

// let baseSpeedEnemy2 = 190; // Базовая скорость
// let speedEnemy2 = baseSpeed; // Текущая скорость
// let lastDashTimeEnemy2 = 0; // Время последнего ускорения
