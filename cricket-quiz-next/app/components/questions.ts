export type Question = {
  q: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
};

export const QUESTIONS: Question[] = [
  {
    q: "Which country won the first Cricket World Cup in 1975?",
    options: ["England", "Australia", "West Indies", "India"],
    answer: 2,
  },
  {
    q: "Who holds the record for the highest individual score in Test cricket (400*)?",
    options: ["Brian Lara", "Sachin Tendulkar", "Don Bradman", "Virender Sehwag"],
    answer: 0,
  },
  {
    q: "Which bowler has taken the most wickets in ODI history?",
    options: ["Muttiah Muralitharan", "Wasim Akram", "Glenn McGrath", "Anil Kumble"],
    answer: 0,
  },
  {
    q: "The Ashes series is played between which two nations?",
    options: [
      "India & Pakistan",
      "Australia & South Africa",
      "England & Australia",
      "New Zealand & England",
    ],
    answer: 2,
  },
  {
    q: "Who was the first batsman to score a double century in ODI cricket?",
    options: ["Rohit Sharma", "Sachin Tendulkar", "Chris Gayle", "Virender Sehwag"],
    answer: 1,
  },
  {
    q: "Which stadium is known as the Home of Cricket?",
    options: ["Eden Gardens", "MCG", "Lord's", "The Oval"],
    answer: 2,
  },
  {
    q: "Which player has the most Player of the Tournament awards in ICC World Cups?",
    options: ["Virat Kohli", "Shakib Al Hasan", "David Warner", "Glenn Maxwell"],
    answer: 1,
  },
  {
    q: "Which team has played the most ICC World Cup finals?",
    options: ["Australia", "England", "New Zealand", "India"],
    answer: 0,
  },
  {
    q: "What is the maximum overs a bowler can bowl in a T20 match?",
    options: ["2", "4", "5", "3"],
    answer: 1,
  },
  {
    q: "Which cricketer took a hat-trick in two consecutive World Cups (2003 & 2007)?",
    options: ["Brett Lee", "Makhaya Ntini", "Lasith Malinga", "Shaun Pollock"],
    answer: 2,
  },
];

export const LETTERS = ["A", "B", "C", "D"] as const;
