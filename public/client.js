document.getElementById('startButton').addEventListener('click', startBot);
document.getElementById('stopButton').addEventListener('click', stopBot);
document.getElementById('changePlayerButton').addEventListener('click', changePlayer);

function changePlayer() {
  const playerNameInput = document.getElementById('playerNameInput').value;
  const playerNumberInput = document.getElementById('playerNumberInput').value;

  if (!playerNameInput || !playerNumberInput) {
    alert('Введите ник и номер игрока');
    return;
  }

  console.log('Sending payload:', { playerName: playerNameInput, playerNumber: parseInt(playerNumberInput, 10) });

  const payload = {
    playerName: playerNameInput,
    playerNumber: parseInt(playerNumberInput, 10)
  };

  fetch('/changePlayer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  .then(response => response.json())
  .then(data => {
    alert(data.message);
  })
  .catch(error => {
    console.error('Error changing player:', error);
  });
}


function displayMessage(message) {
  var messageElement = document.createElement('div');
  messageElement.textContent = message;

  var consoleElement = document.getElementById('console');
  consoleElement.appendChild(messageElement);
}

// Обрабатываем сообщения чата, полученные через сокет
const socket = io();
socket.on('chatMessage', (data) => {
  const { username, message } = data;
  displayMessage(`${username}: ${message}`);
});

// Клиентский код
socket.on('botMessage', (message) => {
  const playerName = message.username;
  const playerMessage = message.message;
  console.log(`[${playerName}]: ${playerMessage}`);
  // Остальной код обработки сообщения от бота
});


function startBot() {
  // Удаляем предыдущий обработчик, чтобы избежать повторного назначения
  document.getElementById('startButton').removeEventListener('click', startBot);

  fetch('/startBot')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to start bot: ${response.status} - ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      displayMessage(data.message);
    })
    .catch(error => {
      console.error('Error starting bot:', error.message);
    })
    .finally(() => {
      // После завершения запроса, снова назначаем обработчик
      document.getElementById('startButton').addEventListener('click', startBot);
    });
}

function stopBot() {
  // Удаляем предыдущий обработчик, чтобы избежать повторного назначения
  document.getElementById('stopButton').removeEventListener('click', stopBot);

  fetch('/stopBot')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to stop bot: ${response.status} - ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      displayMessage(data.message);
    })
    .catch(error => {
      console.error('Error stopping bot:', error.message);
    })
    .finally(() => {
      // После завершения запроса, снова назначаем обработчик
      document.getElementById('stopButton').addEventListener('click', stopBot);
    });
}
