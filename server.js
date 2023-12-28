const express = require('express');
const path = require('path');
const mineflayer = require('mineflayer');
const http = require('http');
const socketIO = require('socket.io');
const { pathfinder, goals } = require('mineflayer-pathfinder');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

let bot;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Парсер JSON-тела запроса
app.use(bodyParser.json());

// Маршрут для изменения ника игрока
app.post('/changePlayer', (req, res) => {
  const { playerName, playerNumber } = req.body;
  if (!playerName || !playerNumber) {
    return res.status(400).json({ message: 'Введите ник и номер строки' });
  }

  const coordinatesPath = path.join(__dirname, 'public', 'playerCoordinates.json');
  const fs = require('fs');

  try {
    let playerCoordinates = JSON.parse(fs.readFileSync(coordinatesPath, 'utf8'));

    // Проверка наличия строки
    const matchingIndex = playerCoordinates.findIndex(row => row.number === playerNumber);

    if (matchingIndex === -1) {
      return res.status(400).json({ message: 'Строка с указанным номером не найдена' });
    }

    // Изменяем ник в строке
    playerCoordinates[matchingIndex].name = playerName;

    // Переписываем файл
    fs.writeFileSync(coordinatesPath, JSON.stringify(playerCoordinates, null, 2));

    return res.json({ message: `Комнота ${playerNumber} успешно изменена на игрока ${playerName}` });
  } catch (error) {
    console.error('Error changing player:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});



app.get('/startBot', (req, res) => {
  if (!bot) {
    bot = mineflayer.createBot({
      host: 'pro.pfaumc.io',
      username: 'ChatGPT_Bot',
      auth: 'offline'
    });

    // Добавляем плагин для работы с путевыми точками
    bot.loadPlugin(pathfinder);

    bot.on('message', (jsonMsg) => {
      // console.log('Raw message from bot:', jsonMsg.toString());
      try {
        const message = JSON.parse(jsonMsg.toString());
        // Отправляем сообщение веб-клиентам через WebSocket
        io.emit('botMessage', message);
      } catch (error) {
        const currentTime = new Date().toLocaleString();
        console.log(`${currentTime} - System (Raw):`, jsonMsg.toString());
        const msg = jsonMsg.toString();
        // Ваш код обработки сообщений чата и выполнения команд

        // Define player coordinates and names
        const coordinatesPath = path.join(__dirname, 'public', 'playerCoordinates.json');
        const fs = require('fs');
        const playerCoordinates = JSON.parse(fs.readFileSync(coordinatesPath, 'utf8'));

        // работа с лс
        if (msg.includes('->')) {
          if (!msg.includes('напиши')) {
            const playerName = getPlayerName(msg);
            if (playerName) {
              // Используем метод find для поиска объекта по имени игрока
              const playerData = playerCoordinates.find(player => player.name === playerName);
              if (playerData) {
                const coordinates = playerData.coordinates;
                if (coordinates) {
                  teleportAndRetreat(coordinates, playerName);
                } else {
                  console.log(`Player ${playerName} not found in the coordinates list.`);
                }
              }
            }
          } else if (msg.includes('напиши')) {
            const messageToWrite = msg.split('напиши ')[1];
            if (messageToWrite) {
              bot.chat(messageToWrite);
            } else {
              console.log(`Invalid usage of "напиши" command. Example: напиши Привет`);
            }
          }
        }
      }
    });


    res.json({ message: 'Bot started' });
  } else {
    res.json({ message: 'Bot is already running' });
  }
});

app.get('/stopBot', (req, res) => {
  if (bot) {
    bot.end();
    bot = null;
    res.json({ message: 'Bot stopped' });
  } else {
    res.json({ message: 'Bot is not running' });
  }
});

// Подключаем сокет для обмена сообщениями между сервером и клиентом
io.on('connection', (socket) => {
  console.log('A user connected');
  
  // Обработка отключения пользователя
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

// Вспомогательные функции

const teleportAndRetreat = (coordsList, playerName) => {
  console.log(`Телепортирую: ${playerName}...`);

  // Создаем массив целей на основе переданных координат
  const goalsList = coordsList.map(coords => new goals.GoalBlock(coords[0], coords[1], coords[2]));

  // Устанавливаем первую цель
  bot.pathfinder.setGoal(goalsList[0]);

  // Ждем, пока бот достигнет первой цели
  setTimeout(() => {
    // После задержки переходим к следующей цели
    bot.pathfinder.setGoal(goalsList[1]);

    // Ждем, пока бот достигнет второй цели
    setTimeout(() => {
      // Возвращаем бота к первой цели
      bot.pathfinder.setGoal(goalsList[0]);

      // Ждем, пока бот достигнет первой цели
      setTimeout(() => {
        // Устанавливаем цель для отступления
        const retreatGoal = new goals.GoalBlock(-60, 83, 20);
        bot.pathfinder.setGoal(retreatGoal);
      }, 2000);
    }, 2000);
  }, 2000 * (goalsList.length - 1));
};

function getPlayerName(msg) {
  const arrowIndex = msg.indexOf('->');
  const playerNameIndex = msg.indexOf('✉') + 1;

  if (arrowIndex !== -1 && playerNameIndex !== -1) {
    return msg.substring(playerNameIndex, arrowIndex).trim();
  }

  return null;
}
