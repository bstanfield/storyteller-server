const glob = require("glob-promise");
const fs = require("fs").promises;
const fsSync = require("fs");
const moment = require("moment");
const fetch = require("node-fetch");

const findPuzzleBySearchString = async (string) => {
  const filePaths = await glob("crosswords/**/*.json");
  const cwData = await Promise.all(
    filePaths.map((fp) => fs.readFile(fp, "utf8"))
  );
  // All Crosswords
  const cwJSON = cwData.map((cw) => JSON.parse(cw));
  const recentPuzzles = cwJSON.slice(-60);

  // Special condition to return most recent 60 puzzles
  if (string === '*') {
    return { matches: recentPuzzles };
  }

  // Condition for string = date
  let directDateMatch = [];
  if (Date.parse(string)) {
    const validMatch = cwJSON.filter(cw => Date.parse(cw.date) === Date.parse(string));
    if (validMatch.length > 0) {
      directDateMatch = [{
        title: validMatch[0].title,
        date: validMatch[0].date,
        author: validMatch[0].author,
        dow: validMatch[0].dow,
        match: validMatch[0].date,
        jnotes: validMatch[0].jnotes,
      }]
    }
  }

  // Condition for non-date string match
  let stringMatches = [];
  cwJSON.map(cw => {
    let acrossClues = cw.clues.across.map(clue => clue.toLowerCase())
    for (var clue of acrossClues) {
      if (clue.includes(string.toLowerCase())) {
        stringMatches.push({
          title: cw.title,
          date: cw.date,
          dow: cw.dow,
          author: cw.author,
          match: clue,
          jnotes: cw.jnotes,
        })
        return;
      }
    }

    let downClues = cw.clues.down.map(clue => clue.toLowerCase())
    for (var clue of downClues) {
      if (clue.includes(string.toLowerCase())) {
        stringMatches.push({
          title: cw.title,
          date: cw.date,
          author: cw.author,
          dow: cw.dow,
          match: clue,
          jnotes: cw.jnotes,
        })
        return;
      }
    }

    for (var key of Object.keys(cw)) {
      if (key !== 'date' && key !== 'jnotes' && typeof cw[key] === 'string' && cw[key].toLowerCase().includes(string.toLowerCase())) {
        stringMatches.push({
          title: cw.title,
          date: cw.date,
          author: cw.author,
          dow: cw.dow,
          match: cw[key],
          jnotes: cw.jnotes,
        })
        return;
      }
    }
  })

  return {
    matches: [...stringMatches, ...directDateMatch],
  }
}

const findNewPuzzle = async (dow, daily, dateRange, query) => {
  // Grabs today's crossword.
  if (daily) {
    const date = new Date();
    const today = moment(date);
    const todayButFormatted = today.format("L");

    const months = [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
    ];

    const year = date.getFullYear();
    const month = months[date.getMonth()];
    const day = date.getDate();

    console.log(
      "Checking for: ",
      "./crosswords/" + year + "/" + month + "/" + day + ".json"
    );

    // Check if today's crossword is downloaded already.
    if (
      fsSync.existsSync(
        "./crosswords/" + year + "/" + month + "/" + day + ".json"
      )
    ) {
      console.log("File exists already.");
    } else {
      console.log(
        "File does not exist!",
        "./crosswords/" + year + "/" + month + "/" + day + ".json"
      );

      // File doesn't exist. Download it!
      let url =
        "https://www.xwordinfo.com/JSON/Data.ashx?format=text&date=" +
        todayButFormatted;

      let options = {
        method: 'GET',
        "headers": {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "no-cache",
          "pragma": "no-cache",
          "sec-ch-ua": "\".Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"103\", \"Chromium\";v=\"103\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"macOS\"",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "cookie": "ASP.NET_SessionId=jphhhsmu01pvz2p2qnbf2tvo",
          "Referer": "https://www.xwordinfo.com/JSON/",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        },
      };

      console.log("url: ", url);
      const response = await fetch(url, options);

      console.log("new puzzle fetched...");
      const json = await response.json();
      console.log("check for null: ", json.author);

      if (!json.author) {
        console.log("Crossword does not exist! Try with older date?");
      }

      try {
        console.log("checking for month/year parent dirs...");
        await fs.access("./crosswords/" + year + "/" + month);
      } catch (e) {
        console.log("creating parent dir(s)...");
        await fs.mkdir("./crosswords/" + year + "/" + month, {
          recursive: true,
        });
      }

      await fs.writeFile(
        "./crosswords/" + year + "/" + month + "/" + day + ".json",
        JSON.stringify(json)
      );
    }

    const cwData = await fs.readFile(
      "./crosswords/" + year + "/" + month + "/" + day + ".json",
      "utf8"
    );
    const cwJSON = JSON.parse(cwData);

    return cwJSON;
  } else {
    // TODO: ADD FILTER FOR SUNDAY DAILIES
    // Grabs a random crossword from the Vault.
    const filePaths = await glob("crosswords/**/*.json");
    const cwData = await Promise.all(
      filePaths.map((fp) => fs.readFile(fp, "utf8"))
    );
    const cwJSON = cwData.map((cw) => JSON.parse(cw));

    const filterCrosswordsByDate = (crosswords, minDate, query) =>
      crosswords.filter((cw) => {
        const cwDate = new Date(cw.date);
        const minimumDate = new Date(minDate);

        // Has to be exact match if query = true
        if (query) {
          if (Date.parse(cwDate) === Date.parse(minimumDate)) {
            return true;
          } 
          return false;
        }

        if (cwDate > minimumDate) return true;
        return false;
      });

    let relevantCrosswords = cwJSON;
    // This selects a specifc queried crossword
    // i.e. query = 1/17/2000
    if (query) {
      relevantCrosswords = filterCrosswordsByDate(relevantCrosswords, query, true);
      return relevantCrosswords[0];
    }

    if (dateRange) {
      if (dateRange === "2022") {
        relevantCrosswords = filterCrosswordsByDate(relevantCrosswords, "2022");
      }
      if (dateRange === "2021") {
        relevantCrosswords = filterCrosswordsByDate(relevantCrosswords, "2021");
      }

      if (dateRange === "2015+") {
        relevantCrosswords = filterCrosswordsByDate(relevantCrosswords, "2015");
      }

      if (dateRange === "2010+") {
        relevantCrosswords = filterCrosswordsByDate(relevantCrosswords, "2010");
      }

      if (dateRange === "2005+") {
        relevantCrosswords = filterCrosswordsByDate(relevantCrosswords, "2005");
      }
    }

    const dowCrosswords = relevantCrosswords.filter((cw) => cw.dow === dow);
    return dowCrosswords[Math.floor(Math.random() * dowCrosswords.length)];
  }
};

const createDownAndAcrossWordGroupings = (board) => {
  let word = "";
  let wordPositions = [];

  let acrossWordMappings = [];
  let acrossRowPosition = 0;
  board.grid.map((letter, index) => {
    acrossRowPosition++;

    if (letter === ".") {
      if (word !== "") acrossWordMappings.push({ [word]: wordPositions });
      word = "";
      wordPositions = [];
    } else {
      word = word + letter;
      wordPositions.push(index + 1);
    }

    if (acrossRowPosition === 15) {
      if (word !== "") acrossWordMappings.push({ [word]: wordPositions });
      acrossRowPosition = 0;
      word = "";
      wordPositions = [];
    }
  });

  let position = 1;
  let grouping = [];
  while (position <= board.size.cols * board.size.rows) {
    if (board.grid[position - 1] !== ".") {
      let match = false;
      if (grouping.length === 0) {
        grouping.push([position]);
      } else {
        grouping.map((group, index) => {
          if (group.includes(position - 15)) {
            match = true;
            grouping[index].push(position);
          }
        });
        if (!match) {
          grouping.push([position]);
        }
      }
    }
    position++;
  }

  // TODO: Use this code to add to ijnitial obj instead of using frontend
  const downWordMappings = grouping.map((group) => {
    let word = "";
    let positions = [];
    group.map((position) => {
      word = word + board.grid[position - 1];
      positions.push(position);
    });
    return { [word]: positions };
  });

  return {
    down: downWordMappings,
    across: acrossWordMappings,
  };
};

// const searchDirectionForLongestWord = (mapping) => {
//   let longestWord = { word: '', positions: [], direction: '' };
//   mapping.map(wordMappingObj => {
//     Object.entries(wordMappingObj).forEach(entry => {
//       const [word, positions] = entry;
//       if (word.length > longestWord.word.length) {
//         longestWord = { word, positions, direction: 'across' }
//       }
//     })
//   })
//   return longestWord;
// }

// const findLongestWord = (mappings, scores) => {
//   const longestAcross = searchDirectionForLongestWord(mappings.across);
//   const longestDown = searchDirectionForLongestWord(mappings.down);
//   return longestAcross.word.length > longestDown.word.length ? longestAcross : longestDown;
// }

const checkIfLetterAddsToScore = (
  puzzle,
  player,
  position,
  letter,
  correct
) => {
  // mappings = mapping of answer strings to positions on board (ie 'JETS' => 1, 2, 3, 4)
  const { scores, mappings, guesses, board } = puzzle;
  letter = letter.toLowerCase();
  const claimed = scores.claimedGuesses.includes(position);
  const puzzleIsComplete = !guesses.includes("");

  // Count incorrects
  // TODO: Undo
  if (true) {
    // if (puzzleIsComplete) {
    let incorrects = [];
    board.grid.map((letter, index) => {
      if (letter === "." || guesses[index] === ".") {
        return;
      }

      if (letter.toLowerCase() !== guesses[index].toLowerCase()) {
        incorrects.push(index + 1);
      }

      // TODO: Compare each spot in grid with user guesses. Send back incomplete grid positions
    });
    scores.incorrects = incorrects;

    // Claimed Guesses
    if (correct && !claimed) {
      scores.claimedGuesses.push(position);
      if (scores.claimedGuessesLookup[player]) {
        scores.claimedGuessesLookup[player].push(position);
      } else {
        scores.claimedGuessesLookup[player] = [position];
      }
    }

    // Case: highestAccuracy
    if (correct && !claimed) {
      if (scores.highestAccuracy[player]) {
        scores.highestAccuracy[player].correct++;
      } else {
        scores.highestAccuracy[player] = { correct: 1, incorrect: 0 };
      }
    } else {
      if (scores.highestAccuracy[player]) {
        scores.highestAccuracy[player].incorrect++;
      } else {
        scores.highestAccuracy[player] = { correct: 0, incorrect: 1 };
      }
    }

    // Case: toughLetters
    if (correct && ["x", "y", "z"].includes(letter) && !claimed) {
      if (scores.toughLetters[player]) {
        scores.toughLetters[player]++;
      } else {
        scores.toughLetters[player] = 1;
      }
    }

    // Tally incorrect guesses
    if (!correct) {
      if (scores.incorrectGuesses[player]) {
        scores.incorrectGuesses[player].push(position);
      } else {
        scores.incorrectGuesses[player] = [position];
      }
    }

    // Case: Editor (TODO: rename to "Medic")
    if (correct && !claimed) {
      Object.entries(scores.incorrectGuesses).forEach((entry) => {
        const incorrectGuessesPlayer = Object.values(entry)[0];
        // Only look at other people's wrong guesses
        if (incorrectGuessesPlayer !== player) {
          if (
            scores.incorrectGuesses[incorrectGuessesPlayer].includes(position)
          ) {
            // This means someone correctly fixed a previously incorrect guess!
            if (scores.editor[player]) {
              scores.editor[player]++;
            } else {
              scores.editor[player] = 1;
            }
          }
        }
      });
    }

    // Case: hotStreak
    if (correct && !claimed) {
      if (scores.hotStreak[player]) {
        const lastItem = scores.hotStreak[player].length - 1;
        scores.hotStreak[player][lastItem] =
          scores.hotStreak[player][lastItem] + 1;
      } else {
        scores.hotStreak[player] = [1];
      }
    }
    if (!correct && scores.hotStreak[player] && !claimed) {
      const lastItem = scores.hotStreak[player].length - 1;

      // Prevents endless number of 0's for endless incorrect guesses
      if (scores.hotStreak[player][lastItem] !== 0) {
        scores.hotStreak[player].push(0);
      }
    }

    // Longest word
    // if (puzzleIsComplete) {
    //   const longestWord = findLongestWord(mappings, scores);

    //   Object.entries(scores.claimedGuessesLookup).forEach(entry => {
    //     const [person, values] = entry;
    //     // values = [1,2,3]
    //     // person = 'ben'

    //     // check each number in positions and if it exists in person's values
    //     let successfulMapping = false;
    //     for (const position of longestWord.positions) {
    //       if (values.includes(position)) {
    //         successfulMapping = true;
    //       } else {
    //         successfulMapping = false;
    //         // break;
    //         // ^ is this mportant?
    //       }
    //     }

    //     if (successfulMapping) {
    //       scores.longestWord[person] = longestWord.word;
    //     } else {
    //       scores.longestWord['2+ people'] = longestWord.word;
    //     }
    //   })
    // }

    // Case: Thief
    if (puzzleIsComplete) {
      // Let's start with across
      const thiefScores = {};

      Object.entries(scores.claimedGuessesLookup).forEach((entry) => {
        const [person, values] = entry;
        let thiefScore = 0;

        const wordMappings = [...mappings.across, ...mappings.down];

        // Map over each word...
        wordMappings.map((mapping) => {
          // positions = ie [0, 1, 2, 3]
          let lettersAnsweredInWord = 0;
          const positions = Object.values(mapping)[0];

          // Map over each letter in word...
          positions.map((position) => {
            if (values.includes(position)) {
              lettersAnsweredInWord++;
            }
          });

          if (lettersAnsweredInWord === 1) {
            thiefScore++;
          }
        });

        thiefScores[person] = thiefScore;
      });
      scores.thief = thiefScores;
    }

    // Case: Benchwarmer
    if (puzzleIsComplete) {
      let benchwarmerScores = {};
      Object.entries(scores.claimedGuessesLookup).forEach((entry) => {
        const [person, values] = entry;
        benchwarmerScores[person] = values.length;
      });

      scores.benchwarmer = benchwarmerScores;
    }

    // Case: Workhorse
    if (puzzleIsComplete) {
      let workhorseScores = {};
      Object.entries(scores.claimedGuessesLookup).forEach((entry) => {
        const [person, values] = entry;
        workhorseScores[person] = values.length;
      });
      scores.workhorse = workhorseScores;
    }

    // Check if puzzle is complete AND the last answer was correct
    // TODO: This actually might not provide the 100% correct completed_at time -- puzzle should
    // only be complete if THERE ARE NO INCORRECTS
    if (incorrects.length === 0 && puzzleIsComplete) {
      const completed = new Date();
      return { completed: completed };
    }

    if (incorrects.length > 0 && puzzleIsComplete) {
      const filled = new Date();
      return { filled: filled };
    }

    return false;
  }
};

module.exports = {
  findNewPuzzle,
  createDownAndAcrossWordGroupings,
  checkIfLetterAddsToScore,
  findPuzzleBySearchString,
};
