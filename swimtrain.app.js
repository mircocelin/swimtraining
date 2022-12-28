const storage = require("Storage");
const BANGLE_V = 2;
const MAXTRAININGS = 10;
const fileName = "swimtraining";
const timeFileName = `t_${Date.now()}.csv`;
let WIDTH;
let HEIGHT;
let ROW1;
let ROW2;
let ROW3;
let ROW4;
let ROW_START;
let WIDTHSTOPW;
let WIDTHNPOOL;
let WIDTHROW3;
let FONTSIZE;
let FONTCOLOR;
let TOP_ROW4;
let fileNumber;
let training;
let nTotPool;
let nPool;
let progPool;
let timeStopWatch;
let isStopWatchActive;
let isRestActive;
let intervalRest;
let intervalStopWatch;
let intervalBtn1;
let intervalBtn3;

function showMenu() {
  WIDTH = 240;
  HEIGHT = 240;
  ROW1 = HEIGHT - 210;
  ROW2 = HEIGHT - 146;
  ROW3 = HEIGHT - 70;
  ROW4 = HEIGHT - 14;
  ROW_START = HEIGHT - 134;
  WIDTHSTOPW = WIDTH - 64;
  WIDTHNPOOL = WIDTH - 164;
  WIDTHROW3 = 13 + WIDTH / 2;
  TOP_ROW4 = ROW4 - 14;
  FONTSIZE = 4;
  FONTCOLOR = "#ffffff";
  if (BANGLE_V == 2) {
    WIDTH = 176;
    HEIGHT = 176;
    ROW1 = HEIGHT - 146;
    ROW2 = HEIGHT - 102;
    ROW3 = HEIGHT - 42;
    ROW4 = HEIGHT - 12;
    ROW_START = HEIGHT - 90;
    WIDTHSTOPW = WIDTH - 34;
    WIDTHNPOOL = WIDTH - 134;
    WIDTHROW3 = 4 + WIDTH / 2;
    TOP_ROW4 = ROW4 - 24;
    FONTSIZE = 3;
    FONTCOLOR = "#000000";
  }
  fileNumber = 1;
  training = [];
  nTotPool = 0;
  nPool = 0;
  progPool = 0;
  timeStopWatch = 0;
  isStopWatchActive = false;
  isRestActive = false;
  intervalRest = 0;
  intervalStopWatch = 0;
  intervalBtn1 = 0;
  intervalBtn3 = 0;
  let menu = {
    "": { title: "Swim Training" },
    "File No": {
      value: fileNumber,
      min: 1,
      max: MAXTRAININGS,
      onchange: (v) => {
        fileNumber = v;
      },
    },
    Start: function () {
      E.showMenu();
      startTraining(fileNumber);
    },
    Exit: function () {
      load();
    },
  };
  E.showMenu(menu);
}

function startTraining(fileNumber) {
  function getTraining() {
    function handleSubPool(t) {
      let newTrainFile = [],
        pool = [],
        cicloNewTrainFile = 0;

      for (
        let cicloTrainFile = 0;
        cicloTrainFile < t.length - 1; // exclude last element with nTotPool
        cicloTrainFile++
      ) {
        pool = t[cicloTrainFile];

        if (parseInt(pool[0]) > 1) {
          let subPool = [];
          subPool[1] = pool[1];
          subPool[2] = pool[2];

          for (let cicloPool = 0; cicloPool < pool[0]; cicloPool++) {
            subPool[0] = `${(cicloPool + 1).toString()}/${pool[0]}`;
            newTrainFile.push(subPool.slice(0));
            cicloNewTrainFile++;
          }
        } else {
          newTrainFile[cicloNewTrainFile] = pool;
          cicloNewTrainFile++;
        }
      }

      return newTrainFile;
    }

    storage
      .open("s.csv", "w")
      .write(storage.read(`${fileName + fileNumber}.csv`));
    let file = storage.open("s.csv", "r"),
      line = "",
      trainFile = [],
      n = 0;

    while ((line = file.readLine()) !== undefined) {
      trainFile[n] = line.split(";");
      n++;
    }

    nTotPool = trainFile[trainFile.length - 1][0];

    return handleSubPool(trainFile);
  }

  training = getTraining();
  drawStart();
  setWatches();
}

function stopTraining() {
  clearInterval(intervalStopWatch);
  clearWatch(intervalBtn1);
  if (BANGLE_V == 1) clearWatch(intervalBtn3);
  Bangle.setLCDTimeout(10);
  g.clear();

  return showMenu();
}

function setWatches() {
  intervalBtn1 = setWatch(
    () => {
      goToNextPool();
    },
    BTN1,
    { repeat: true }
  );

  if (BANGLE_V == 1) {
    intervalBtn3 = setWatch(
      () => {
        goToPrevPool();
      },
      BTN3,
      { repeat: true }
    );
  }
}

function saveToFile() {
  if (nPool > 0) {
    storage
      .open(timeFileName, "a")
      .write(
        toMinutes(timeStopWatch) +
          ";" +
          training[nPool - 1][0] +
          ";" +
          training[nPool - 1][1] +
          ";" +
          training[nPool - 1][2]
      );
  } else {
    storage
      .open(timeFileName, "w")
      .write(`${toMinutes(timeStopWatch)};START;${fileName}${fileNumber}\n`);
  }
}

function goToNextPool() {
  if (!isStopWatchActive) {
    startStopWatch();
    isStopWatchActive = true;
  }

  if (isRestActive) {
    isRestActive = false;
    clearInterval(intervalRest);
  }

  saveToFile();

  if (nPool > training.length - 1) stopTraining();
  else {
    nPool++;
    handlePool(1);
  }
}

function goToPrevPool() {
  if (nPool > 0) {
    if (isRestActive) {
      isRestActive = false;
      clearInterval(intervalRest);
    }

    if (nPool > 1) nPool--;

    handlePool(0);
  }
}

function handlePool(n) {
  let pool = training[nPool - 1];

  if (pool[0] == "r") {
    drawRest(pool[1]);
    startRestCounter(pool[1]);
  } else {
    if (n) progPool++;
    else progPool--;
    drawPool(pool);
  }
}

function startRestCounter(timeRest) {
  function countDown() {
    timeRest--;
    if (timeRest == 0) {
      isRestActive = false;
      clearInterval(intervalRest);
    }

    drawRest(timeRest);
  }
  isRestActive = true;
  intervalRest = setInterval(countDown, 1000);
}

function startStopWatch() {
  function counter() {
    timeStopWatch++;

    drawStopWatch();
  }
  Bangle.setLCDPower(1);
  Bangle.setLCDTimeout(0);
  intervalStopWatch = setInterval(counter, 1000);
}

function toMinutes(t) {
  let seconds = t % 60;
  if (seconds < 10) seconds = `0${seconds}`;

  return `${Math.floor(t / 60)}:${seconds}`;
}

function drawStart() {
  g.clear();
  g.setColor(FONTCOLOR)
    .setFont("6x8", FONTSIZE)
    .setFontAlign(0, 0)
    .drawString("START", WIDTH / 2, ROW_START);
}

function drawPool(pool) {
  clearTopScreen();
  g.setColor(FONTCOLOR)
    .setFont("6x8", FONTSIZE)
    .setFontAlign(0, 0)
    .drawString(pool[0], WIDTH / 2, ROW1)
    .drawString(pool[1].toUpperCase(), WIDTH / 2, ROW2);
  g.setFont("6x8", FONTSIZE - 1).drawString(
    pool[2].toUpperCase(),
    WIDTHROW3,
    ROW3
  );
}

function drawRest(timeRest) {
  clearTopScreen();
  g.setColor(FONTCOLOR)
    .setFont("6x8", FONTSIZE)
    .setFontAlign(0, 0)
    .drawString("RIPOSO", WIDTH / 2, ROW1)
    .drawString(timeRest, WIDTH / 2, ROW2);
}

function drawStopWatch() {
  clearBottomScreen();
  g.setColor(FONTCOLOR)
    .setFont("6x8", FONTSIZE - 1)
    .setFontAlign(0, 0)
    .drawString(toMinutes(timeStopWatch), WIDTHSTOPW, ROW4)
    .drawString(`${progPool}/${nTotPool}`, WIDTHNPOOL, ROW4);
}

function clearTopScreen() {
  g.clearRect(0, 0, WIDTH, TOP_ROW4);
}

function clearBottomScreen() {
  g.clearRect(0, ROW4 - 22, WIDTH, HEIGHT);
}

showMenu();
