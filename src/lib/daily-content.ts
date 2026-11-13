/**
 * Seed library for the daily cards (PRD FR-6, FR-7). Admins can add, edit or disable items in Settings later.
 *  - scripture: King James Version (public domain).
 *  - romance: public-domain poetry and plays (all authors died before 1955).
 *  - love, faith, encouragement: original lines written for Lawal's diary.
 * Plain data, no imports, so the seed script and unit tests can both load it.
 */

export type DailyKind = "scripture" | "romance" | "love" | "faith" | "encouragement";

export type DailySeedItem = {
  kind: DailyKind;
  text: string;
  attribution?: string;
  reference?: string;
  translation?: string;
};

const KJV = "KJV";

const scripture: Array<[reference: string, text: string]> = [
  [
    "Song of Solomon 8:7",
    "Many waters cannot quench love, neither can the floods drown it: if a man would give all the substance of his house for love, it would utterly be contemned.",
  ],
  ["Ecclesiastes 4:9", "Two are better than one; because they have a good reward for their labour."],
  [
    "Ecclesiastes 4:12",
    "And if one prevail against him, two shall withstand him; and a threefold cord is not quickly broken.",
  ],
  [
    "1 Corinthians 13:13",
    "And now abideth faith, hope, charity, these three; but the greatest of these is charity.",
  ],
  ["1 John 4:19", "We love him, because he first loved us."],
  [
    "1 John 4:18",
    "There is no fear in love; but perfect love casteth out fear: because fear hath torment. He that feareth is not made perfect in love.",
  ],
  [
    "1 Peter 4:8",
    "And above all things have fervent charity among yourselves: for charity shall cover the multitude of sins.",
  ],
  ["Colossians 3:14", "And above all these things put on charity, which is the bond of perfectness."],
  [
    "Ephesians 4:32",
    "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you.",
  ],
  ["Proverbs 3:5", "Trust in the LORD with all thine heart; and lean not unto thine own understanding."],
  ["Proverbs 3:6", "In all thy ways acknowledge him, and he shall direct thy paths."],
  ["Philippians 4:13", "I can do all things through Christ which strengtheneth me."],
  [
    "Philippians 4:6",
    "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.",
  ],
  [
    "Isaiah 40:31",
    "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
  ],
  ["Psalm 118:24", "This is the day which the LORD hath made; we will rejoice and be glad in it."],
  [
    "Lamentations 3:22–23",
    "It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.",
  ],
  [
    "Joshua 1:9",
    "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
  ],
  ["Psalm 46:1", "God is our refuge and strength, a very present help in trouble."],
  ["Psalm 23:1", "The LORD is my shepherd; I shall not want."],
  [
    "Romans 8:28",
    "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
  ],
  [
    "Romans 15:13",
    "Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.",
  ],
  ["Song of Solomon 2:16", "My beloved is mine, and I am his: he feedeth among the lilies."],
  ["Song of Solomon 6:3", "I am my beloved's, and my beloved is mine: he feedeth among the lilies."],
  [
    "Song of Solomon 8:6",
    "Set me as a seal upon thine heart, as a seal upon thine arm: for love is strong as death; jealousy is cruel as the grave: the coals thereof are coals of fire, which hath a most vehement flame.",
  ],
  ["Proverbs 18:22", "Whoso findeth a wife findeth a good thing, and obtaineth favour of the LORD."],
  [
    "Genesis 2:24",
    "Therefore shall a man leave his father and his mother, and shall cleave unto his wife: and they shall be one flesh.",
  ],
  [
    "Matthew 19:6",
    "Wherefore they are no more twain, but one flesh. What therefore God hath joined together, let not man put asunder.",
  ],
  [
    "Numbers 6:24–26",
    "The LORD bless thee, and keep thee: The LORD make his face shine upon thee, and be gracious unto thee: The LORD lift up his countenance upon thee, and give thee peace.",
  ],
  [
    "Jeremiah 29:11",
    "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.",
  ],
  ["Psalm 37:4", "Delight thyself also in the LORD; and he shall give thee the desires of thine heart."],
  ["Matthew 11:28", "Come unto me, all ye that labour and are heavy laden, and I will give you rest."],
  ["John 15:12", "This is my commandment, That ye love one another, as I have loved you."],
  ["Galatians 6:2", "Bear ye one another's burdens, and so fulfil the law of Christ."],
  [
    "Psalm 30:5",
    "For his anger endureth but a moment; in his favour is life: weeping may endure for a night, but joy cometh in the morning.",
  ],
  ["Proverbs 17:17", "A friend loveth at all times, and a brother is born for adversity."],
  [
    "1 Thessalonians 5:11",
    "Wherefore comfort yourselves together, and edify one another, even as also ye do.",
  ],
  [
    "Micah 6:8",
    "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?",
  ],
  ["Psalm 34:8", "O taste and see that the LORD is good: blessed is the man that trusteth in him."],
];

const romance: Array<[attribution: string, text: string]> = [
  [
    "William Shakespeare, Sonnet 18",
    "Shall I compare thee to a summer's day?\nThou art more lovely and more temperate.",
  ],
  [
    "William Shakespeare, Sonnet 18",
    "So long as men can breathe, or eyes can see,\nSo long lives this, and this gives life to thee.",
  ],
  [
    "William Shakespeare, Sonnet 116",
    "Let me not to the marriage of true minds\nAdmit impediments. Love is not love\nWhich alters when it alteration finds,\nOr bends with the remover to remove.",
  ],
  [
    "William Shakespeare, Sonnet 29",
    "For thy sweet love remember'd such wealth brings\nThat then I scorn to change my state with kings.",
  ],
  [
    "Elizabeth Barrett Browning, Sonnets from the Portuguese 43",
    "How do I love thee? Let me count the ways.",
  ],
  [
    "Elizabeth Barrett Browning, Sonnets from the Portuguese 43",
    "I love thee with the breath,\nSmiles, tears, of all my life; and, if God choose,\nI shall but love thee better after death.",
  ],
  [
    "Elizabeth Barrett Browning, Sonnets from the Portuguese 14",
    "If thou must love me, let it be for nought\nExcept for love's sake only.",
  ],
  ["Robert Burns, A Red, Red Rose", "And I will luve thee still, my dear,\nTill a' the seas gang dry."],
  [
    "Lord Byron, She Walks in Beauty",
    "She walks in beauty, like the night\nOf cloudless climes and starry skies;",
  ],
  ["Robert Browning, Rabbi Ben Ezra", "Grow old along with me!\nThe best is yet to be,"],
  [
    "Percy Bysshe Shelley, Love's Philosophy",
    "Nothing in the world is single;\nAll things by a law divine\nIn one spirit meet and mingle.\nWhy not I with thine?",
  ],
  ["Anne Bradstreet, To My Dear and Loving Husband", "If ever two were one, then surely we."],
  [
    "Anne Bradstreet, To My Dear and Loving Husband",
    "Then while we live, in love let's so persevere\nThat when we live no more, we may live ever.",
  ],
  [
    "William Shakespeare, Hamlet",
    "Doubt thou the stars are fire;\nDoubt that the sun doth move;\nDoubt truth to be a liar;\nBut never doubt I love.",
  ],
  [
    "William Shakespeare, Romeo and Juliet",
    "My bounty is as boundless as the sea,\nMy love as deep; the more I give to thee,\nThe more I have, for both are infinite.",
  ],
  ["William Shakespeare, A Midsummer Night's Dream", "The course of true love never did run smooth."],
  [
    "William Shakespeare, A Midsummer Night's Dream",
    "Love looks not with the eyes, but with the mind;\nAnd therefore is wing'd Cupid painted blind.",
  ],
  [
    "Christopher Marlowe, The Passionate Shepherd to His Love",
    "Come live with me and be my love,\nAnd we will all the pleasures prove",
  ],
  [
    "Christina Rossetti, The First Day",
    "I wish I could remember that first day,\nFirst hour, first moment of your meeting me,",
  ],
  ["George Herbert, Love (III)", "Love bade me welcome: yet my soul drew back,\nGuilty of dust and sin."],
  ["Emily Dickinson", "Wild nights – Wild nights!\nWere I with thee\nWild nights should be\nOur luxury!"],
  ["Emily Dickinson", "That Love is all there is\nIs all we know of Love;"],
  ["John Keats, Bright Star", "Bright star, would I were stedfast as thou art—"],
  [
    "W. B. Yeats, He Wishes for the Cloths of Heaven",
    "But I, being poor, have only my dreams;\nI have spread my dreams under your feet;\nTread softly because you tread on my dreams.",
  ],
  [
    "W. B. Yeats, When You Are Old",
    "But one man loved the pilgrim soul in you,\nAnd loved the sorrows of your changing face;",
  ],
  [
    "Edgar Allan Poe, Annabel Lee",
    "But we loved with a love that was more than love—\nI and my Annabel Lee—",
  ],
  [
    "Sir Philip Sidney, My True-Love Hath My Heart",
    "My true-love hath my heart and I have his,\nBy just exchange one for the other given:",
  ],
  [
    "Friedrich Halm, Ingomar the Barbarian (tr. Maria Lovell)",
    "Two souls with but a single thought,\nTwo hearts that beat as one.",
  ],
  ["William Shakespeare, As You Like It", "No sooner met but they looked; no sooner looked but they loved;"],
  ["Ben Jonson, Song: To Celia", "Drink to me only with thine eyes,\nAnd I will pledge with mine;"],
  [
    "William Wordsworth, She Was a Phantom of Delight",
    "She was a Phantom of delight\nWhen first she gleamed upon my sight;",
  ],
  ["John Donne, The Good-Morrow", "I wonder, by my troth, what thou and I\nDid, till we loved?"],
  ["John Donne, The Canonization", "For God's sake hold your tongue, and let me love,"],
];

const love: string[] = [
  "Leave a short note somewhere it will be found tomorrow morning.",
  "Ask about the best part of the day, then ask one more question about it.",
  "Make the other person's drink exactly the way they like it, without being asked.",
  "Put your phones in another room for the first half hour of the evening.",
  "Send a photo of something that reminded you of each other today.",
  "Say thank you for one small thing that usually goes unnoticed.",
  "Plan a ten-minute walk together after dinner.",
  "Tell the story of the day you knew, as if it happened yesterday.",
  "Pray for each other out loud, even if it's only one sentence.",
  "Take over one chore that's normally not yours.",
  "Hold hands for a whole conversation.",
  "Write down three things you admire, and read them aloud tonight.",
  "Choose a song that sounds like the two of you and play it in the kitchen.",
  'Ask: "What would make this week feel lighter for you?" and act on the answer.',
  "Cook something together, even if it's only toast.",
  "Look through old photos for five minutes and pick a favourite.",
  "Send a voice note instead of a text today.",
  "Plan the next date night now — put it in the calendar.",
  "Give a full, unhurried hug. Count to twenty.",
  'Say "I\'m proud of you" and name exactly why.',
  "Ask for advice on something small and take it.",
  "Bring home a small treat with no reason attached.",
  "Read a psalm together before sleeping.",
  "Recreate your first meal together, or the closest thing to it.",
  "Ask what dream has been quiet lately, and how you can help it along.",
  "Write a one-line prayer for tomorrow and leave it on the pillow.",
  "Laugh about the funniest thing that ever went wrong between you.",
  "Make tomorrow's lunch or breakfast for the other person tonight.",
  "Turn off the TV and talk about where you'd like to be in five years.",
  "Write in this diary together tonight — one entry, two voices.",
  'Ask: "When did you feel most loved by me this month?"',
  "Let the other person pick the plan tonight, and say yes to it.",
];

const faith: string[] = [
  "Grace is not earned in a day, and it is not lost in a day either.",
  "Small faithfulness, repeated, becomes a strong foundation.",
  "Bring today's worries to God first, and to each other second.",
  "The same God who began this story is still writing it.",
  "Rest is also an act of trust.",
  "Gratitude spoken out loud grows faster than gratitude kept inside.",
  "Patience with each other is a quiet kind of worship.",
  "When the path is unclear, the next faithful step is usually enough.",
  "A home built on prayer can weather a lot of weather.",
  "Mercy received is meant to be passed on.",
  "God is not in a hurry, and neither is love.",
  "Joy is a choice made again each morning.",
  "Forgiveness keeps the door of the heart from rusting shut.",
  "What is planted in faith is rarely wasted.",
  "Serve one another today the way Christ served.",
  "There is room at God's table for every worry you carry.",
  "Hope is not wishful thinking; it is remembering who holds tomorrow.",
  "Two who pray together learn to listen together.",
  "Ordinary days are holy ground too.",
  "Trust grows in the waiting.",
  "Let kindness be the first word and the last word today.",
  "A soft answer still has power.",
  "God's mercies are new this morning — so is your chance to begin again.",
  "Faith does not remove every storm; it gives you someone in the boat.",
  "Be quick to listen and slow to be offended.",
  "Generosity is faith with its hands open.",
  "Every blessing counted is a seed for the next one.",
  "Peace is a gift to receive, not a prize to win.",
  "Humility makes room for both of you to be right sometimes.",
  "Take the next step in obedience, even if it is a small one.",
  "The love you give today is a prayer with feet.",
  "What God has joined, God also sustains.",
];

const encouragement: string[] = [
  "You don't have to finish everything today to have done today well.",
  "Progress counts even when it's slow.",
  "You are allowed to rest before you are exhausted.",
  "One honest conversation can change a whole week.",
  "Hard seasons are seasons, not sentences.",
  "You have carried difficult things before, and you are still here.",
  "Be as kind to yourself as you would be to each other.",
  "Today is a good day to start small.",
  "Showing up is half of loving well.",
  "The best part of the story is often the part still being written.",
  "Your effort is seen, even when it isn't mentioned.",
  "It is fine to ask for help. That is what partners are for.",
  "A deep breath is a perfectly good place to start.",
  "Celebrate something small tonight.",
  "Courage is often just the next phone call, the next email, the next step.",
  "Some days the win is simply being gentle with each other.",
  "What you are building together is worth the patience.",
  "Mistakes are how plans learn.",
  "Be proud of how far you've come — then keep going.",
  "Nothing is wasted that teaches you to love better.",
  "You are more capable than this week has made you feel.",
  "Make room for laughter, even on serious days.",
  "Tomorrow gets a fresh page. So does tonight.",
  "Your future selves will thank you for today's small kindness.",
  "Quiet strength still counts as strength.",
  "Let today be enough.",
  "You are not behind. You are on your own road.",
  "Choose one thing to let go of today.",
  "Good things are growing, even underground.",
  "Two tired people can still be a great team.",
  "Hope looks good on you.",
  "Keep going — gently.",
];

export const DAILY_CONTENT: DailySeedItem[] = [
  ...scripture.map(([reference, text]) => ({
    kind: "scripture" as const,
    text,
    reference,
    translation: KJV,
  })),
  ...romance.map(([attribution, text]) => ({ kind: "romance" as const, text, attribution })),
  ...love.map((text) => ({ kind: "love" as const, text })),
  ...faith.map((text) => ({ kind: "faith" as const, text })),
  ...encouragement.map((text) => ({ kind: "encouragement" as const, text })),
];
