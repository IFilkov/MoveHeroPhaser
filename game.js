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
let circleBody;
let direction = { x: 1, y: 1 };
let speed = 100; // скорость передвижения
let changeDirectionTime = 2000; // смена направления каждые 8 секунд
let lastDirectionChange = 0;
let controlMode = "autopilot"; // Режим управления: 'autopilot', 'mouse', 'gamepad'
let mousePos = { x: 0, y: 0 }; // Позиция курсора
let gamepad; // Переменная для геймпада

// Функция для предзагрузки ресурсов (если необходимо)
function preload() {}

// Функция для создания начальных объектов в игре
function create() {
  // Создание графического объекта круга и физического тела
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
  if (controlMode === "mouse") {
    moveToMouse(delta);
  } else if (controlMode === "gamepad" && gamepad) {
    moveWithGamepad(delta);
  } else {
    moveRandomly(time, delta);
  }

  // Проверяем нажатие кнопки A на геймпаде для переключения между геймпадом и автопилотом
  if (gamepad && gamepad.buttons[0].pressed) {
    // Кнопка A на геймпаде
    if (controlMode === "autopilot") {
      controlMode = "gamepad";
    } else {
      controlMode = "autopilot";
    }
  }
}

// Функция перемещения к мыши
function moveToMouse(delta) {
  const dx = mousePos.x - circleBody.x;
  const dy = mousePos.y - circleBody.y;
  const angle = Math.atan2(dy, dx);

  circleBody.x += Math.cos(angle) * speed * (delta / 1000);
  circleBody.y += Math.sin(angle) * speed * (delta / 1000);
}

// Функция случайного перемещения
function moveRandomly(time, delta) {
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
