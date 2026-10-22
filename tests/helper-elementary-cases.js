// Original elementary-life examples. This is review/test data, never a lookup override.
// Pronunciations were checked against the decoded local MOE index; current teacher
// tone-bank answers take precedence (including 寶寶/耳朵/嘴巴 35, 底下 34,
// written consecutive third tones, and the bank's approved 一/不 compounds).
// Missing productive phrases such as 還書/種花/得到/看著 need lexical/context rules;
// the dictionary's first reading is not evidence that it is the common reading.
export const ELEMENTARY_HELPER_CASES = [
  {text:'我要喝水', sounds:'ㄨㄛˇ ㄧㄠˋ ㄏㄜ ㄕㄨㄟˇ', focus:'要：想要／要求'},
  {text:'老師要求排隊', sounds:'ㄌㄠˇ ㄕ ㄧㄠ ㄑㄧㄡˊ ㄆㄞˊ ㄉㄨㄟˋ', focus:'要：想要／要求'},
  {text:'我要畫太陽', sounds:'ㄨㄛˇ ㄧㄠˋ ㄏㄨㄚˋ ㄊㄞˋ ㄧㄤˊ', focus:'要：想要／要求'},

  {text:'我吃蘋果', sounds:'ㄨㄛˇ ㄔ ㄆㄧㄥˊ ㄍㄨㄛˇ', focus:'吃：吃東西的常用讀音'},
  {text:'請你吃香蕉', sounds:'ㄑㄧㄥˇ ㄋㄧˇ ㄔ ㄒㄧㄤ ㄐㄧㄠ', focus:'吃：吃東西的常用讀音'},
  {text:'小狗吃肉', sounds:'ㄒㄧㄠˇ ㄍㄡˇ ㄔ ㄖㄡˋ', focus:'吃：吃東西的常用讀音'},

  {text:'請坐這裡', sounds:'ㄑㄧㄥˇ ㄗㄨㄛˋ ㄓㄜˋ ㄌㄧˇ', focus:'請：請求的常用讀音'},
  {text:'請把書放好', sounds:'ㄑㄧㄥˇ ㄅㄚˇ ㄕㄨ ㄈㄤˋ ㄏㄠˇ', focus:'請：請求的常用讀音'},
  {text:'今天我要請假', sounds:'ㄐㄧㄣ ㄊㄧㄢ ㄨㄛˇ ㄧㄠˋ ㄑㄧㄥˇ ㄐㄧㄚˋ', focus:'請：請求的常用讀音'},

  {text:'銀行在學校旁', sounds:'ㄧㄣˊ ㄏㄤˊ ㄗㄞˋ ㄒㄩㄝˊ ㄒㄧㄠˋ ㄆㄤˊ', focus:'行：銀行／行走'},
  {text:'小心行走', sounds:'ㄒㄧㄠˇ ㄒㄧㄣ ㄒㄧㄥˊ ㄗㄡˇ', focus:'行：銀行／行走'},
  {text:'這樣也行', sounds:'ㄓㄜˋ ㄧㄤˋ ㄧㄝˇ ㄒㄧㄥˊ', focus:'行：銀行／行走'},

  {text:'我想快快長大', sounds:'ㄨㄛˇ ㄒㄧㄤˇ ㄎㄨㄞˋ ㄎㄨㄞˋ ㄓㄤˇ ㄉㄚˋ', focus:'長：長大／長短'},
  {text:'比比鉛筆的長短', sounds:'ㄅㄧˇ ㄅㄧˇ ㄑㄧㄢ ㄅㄧˇ ㄉㄜ˙ ㄔㄤˊ ㄉㄨㄢˇ', focus:'長：長大／長短'},
  {text:'這條繩子很長', sounds:'ㄓㄜˋ ㄊㄧㄠˊ ㄕㄥˊ ㄗ˙ ㄏㄣˇ ㄔㄤˊ', focus:'長：長大／長短'},

  {text:'我聽音樂', sounds:'ㄨㄛˇ ㄊㄧㄥ ㄧㄣ ㄩㄝˋ', focus:'樂：音樂／快樂'},
  {text:'今天真快樂', sounds:'ㄐㄧㄣ ㄊㄧㄢ ㄓㄣ ㄎㄨㄞˋ ㄌㄜˋ', focus:'樂：音樂／快樂'},
  {text:'奶奶喜歡音樂', sounds:'ㄋㄞˇ ㄋㄞ˙ ㄒㄧˇ ㄏㄨㄢ ㄧㄣ ㄩㄝˋ', focus:'樂：音樂／快樂'},

  {text:'請重新畫圓圈', sounds:'ㄑㄧㄥˇ ㄔㄨㄥˊ ㄒㄧㄣ ㄏㄨㄚˋ ㄩㄢˊ ㄑㄩㄢ', focus:'重：重新／重要'},
  {text:'洗手很重要', sounds:'ㄒㄧˇ ㄕㄡˇ ㄏㄣˇ ㄓㄨㄥˋ ㄧㄠˋ', focus:'重：重新／重要'},
  {text:'書包太重', sounds:'ㄕㄨ ㄅㄠ ㄊㄞˋ ㄓㄨㄥˋ', focus:'重：重新／重要'},

  {text:'我去還書', sounds:'ㄨㄛˇ ㄑㄩˋ ㄏㄨㄢˊ ㄕㄨ', focus:'還：還書／還有'},
  {text:'盒子裡還有糖', sounds:'ㄏㄜˊ ㄗ˙ ㄌㄧˇ ㄏㄞˊ ㄧㄡˇ ㄊㄤˊ', focus:'還：還書／還有'},
  {text:'明天還要上學', sounds:'ㄇㄧㄥˊ ㄊㄧㄢ ㄏㄞˊ ㄧㄠˋ ㄕㄤˋ ㄒㄩㄝˊ', focus:'還：還書／還有'},

  {text:'我對蝴蝶很好奇', sounds:'ㄨㄛˇ ㄉㄨㄟˋ ㄏㄨˊ ㄉㄧㄝˊ ㄏㄣˇ ㄏㄠˋ ㄑㄧˊ', focus:'好：好奇／好吃'},
  {text:'蘋果真好吃', sounds:'ㄆㄧㄥˊ ㄍㄨㄛˇ ㄓㄣ ㄏㄠˇ ㄔ', focus:'好：好奇／好吃'},
  {text:'我會好好寫字', sounds:'ㄨㄛˇ ㄏㄨㄟˋ ㄏㄠˇ ㄏㄠˇ ㄒㄧㄝˇ ㄗˋ', focus:'好：好奇／好吃'},

  {text:'老師教書很用心', sounds:'ㄌㄠˇ ㄕ ㄐㄧㄠ ㄕㄨ ㄏㄣˇ ㄩㄥˋ ㄒㄧㄣ', focus:'教：教書／教室'},
  {text:'教室裡很安靜', sounds:'ㄐㄧㄠˋ ㄕˋ ㄌㄧˇ ㄏㄣˇ ㄢ ㄐㄧㄥˋ', focus:'教：教書／教室'},
  {text:'爸爸教我畫小魚', sounds:'ㄅㄚˋ ㄅㄚ˙ ㄐㄧㄠ ㄨㄛˇ ㄏㄨㄚˋ ㄒㄧㄠˇ ㄩˊ', focus:'教：教書／教室'},

  {text:'我會數星星', sounds:'ㄨㄛˇ ㄏㄨㄟˋ ㄕㄨˇ ㄒㄧㄥ ㄒㄧㄥ˙', focus:'數：數星星／數學'},
  {text:'今天有數學課', sounds:'ㄐㄧㄣ ㄊㄧㄢ ㄧㄡˇ ㄕㄨˋ ㄒㄩㄝˊ ㄎㄜˋ', focus:'數：數星星／數學'},
  {text:'我們數到十', sounds:'ㄨㄛˇ ㄇㄣ˙ ㄕㄨˇ ㄉㄠˋ ㄕˊ', focus:'數：數星星／數學'},

  {text:'天空有白雲', sounds:'ㄊㄧㄢ ㄎㄨㄥ ㄧㄡˇ ㄅㄞˊ ㄩㄣˊ', focus:'空：天空／空地'},
  {text:'空地上有小花', sounds:'ㄎㄨㄥˋ ㄉㄧˋ ㄕㄤˋ ㄧㄡˇ ㄒㄧㄠˇ ㄏㄨㄚ', focus:'空：天空／空地'},
  {text:'這個紙箱是空的', sounds:'ㄓㄜˋ ㄍㄜ˙ ㄓˇ ㄒㄧㄤ ㄕˋ ㄎㄨㄥ ㄉㄜ˙', focus:'空：天空／空地'},

  {text:'種子放進土裡', sounds:'ㄓㄨㄥˇ ㄗˇ ㄈㄤˋ ㄐㄧㄣˋ ㄊㄨˇ ㄌㄧˇ', focus:'種：種子／種花'},
  {text:'我跟媽媽種花', sounds:'ㄨㄛˇ ㄍㄣ ㄇㄚ ㄇㄚ˙ ㄓㄨㄥˋ ㄏㄨㄚ', focus:'種：種子／種花'},
  {text:'爺爺種青菜', sounds:'ㄧㄝˊ ㄧㄝ˙ ㄓㄨㄥˋ ㄑㄧㄥ ㄘㄞˋ', focus:'種：種子／種花'},

  {text:'我得到紅色貼紙', sounds:'ㄨㄛˇ ㄉㄜˊ ㄉㄠˋ ㄏㄨㄥˊ ㄙㄜˋ ㄊㄧㄝ ㄓˇ', focus:'得：得到／跑得快／得先'},
  {text:'小兔跑得很快', sounds:'ㄒㄧㄠˇ ㄊㄨˋ ㄆㄠˇ ㄉㄜ˙ ㄏㄣˇ ㄎㄨㄞˋ', focus:'得：得到／跑得快／得先'},
  {text:'我得先寫完功課', sounds:'ㄨㄛˇ ㄉㄟˇ ㄒㄧㄢ ㄒㄧㄝˇ ㄨㄢˊ ㄍㄨㄥ ㄎㄜˋ', focus:'得：得到／跑得快／得先'},

  {text:'我看著窗外的小鳥', sounds:'ㄨㄛˇ ㄎㄢˋ ㄓㄜ˙ ㄔㄨㄤ ㄨㄞˋ ㄉㄜ˙ ㄒㄧㄠˇ ㄋㄧㄠˇ', focus:'著：看著／著火'},
  {text:'紙張著火很危險', sounds:'ㄓˇ ㄓㄤ ㄓㄠˊ ㄏㄨㄛˇ ㄏㄣˇ ㄨㄟˊ ㄒㄧㄢˇ', focus:'著：看著／著火'},
  {text:'她笑著向我揮手', sounds:'ㄊㄚ ㄒㄧㄠˋ ㄓㄜ˙ ㄒㄧㄤˋ ㄨㄛˇ ㄏㄨㄟ ㄕㄡˇ', focus:'著：看著／著火'},

  {text:'我覺得今天很熱', sounds:'ㄨㄛˇ ㄐㄩㄝˊ ㄉㄜ˙ ㄐㄧㄣ ㄊㄧㄢ ㄏㄣˇ ㄖㄜˋ', focus:'覺：覺得／睡覺'},
  {text:'小貓在睡覺', sounds:'ㄒㄧㄠˇ ㄇㄠ ㄗㄞˋ ㄕㄨㄟˋ ㄐㄧㄠˋ', focus:'覺：覺得／睡覺'},
  {text:'寶寶睡覺很安靜', sounds:'ㄅㄠˇ ㄅㄠ˙ ㄕㄨㄟˋ ㄐㄧㄠˋ ㄏㄣˇ ㄢ ㄐㄧㄥˋ', focus:'覺：覺得／睡覺'},

  {text:'我的背包是藍色', sounds:'ㄨㄛˇ ㄉㄜ˙ ㄅㄟ ㄅㄠ ㄕˋ ㄌㄢˊ ㄙㄜˋ', focus:'背：背包／背書'},
  {text:'我在背書', sounds:'ㄨㄛˇ ㄗㄞˋ ㄅㄟˋ ㄕㄨ', focus:'背：背包／背書'},
  {text:'哥哥背我過小溪', sounds:'ㄍㄜ ㄍㄜ˙ ㄅㄟ ㄨㄛˇ ㄍㄨㄛˋ ㄒㄧㄠˇ ㄒㄧ', focus:'背：背包／背書'},

  {text:'籃子裡有多少球', sounds:'ㄌㄢˊ ㄗ˙ ㄌㄧˇ ㄧㄡˇ ㄉㄨㄛ ㄕㄠˇ ㄑㄧㄡˊ', focus:'少：多少／少年'},
  {text:'那位少年會打球', sounds:'ㄋㄚˋ ㄨㄟˋ ㄕㄠˋ ㄋㄧㄢˊ ㄏㄨㄟˋ ㄉㄚˇ ㄑㄧㄡˊ', focus:'少：多少／少年'},
  {text:'今天功課比較少', sounds:'ㄐㄧㄣ ㄊㄧㄢ ㄍㄨㄥ ㄎㄜˋ ㄅㄧˇ ㄐㄧㄠˋ ㄕㄠˇ', focus:'少：多少／少年'},

  {text:'走路上學很方便', sounds:'ㄗㄡˇ ㄌㄨˋ ㄕㄤˋ ㄒㄩㄝˊ ㄏㄣˇ ㄈㄤ ㄅㄧㄢˋ', focus:'便：方便／便宜'},
  {text:'這支鉛筆很便宜', sounds:'ㄓㄜˋ ㄓ ㄑㄧㄢ ㄅㄧˇ ㄏㄣˇ ㄆㄧㄢˊ ㄧˊ', focus:'便：方便／便宜'},
  {text:'在門口買菜很方便', sounds:'ㄗㄞˋ ㄇㄣˊ ㄎㄡˇ ㄇㄞˇ ㄘㄞˋ ㄏㄣˇ ㄈㄤ ㄅㄧㄢˋ', focus:'便：方便／便宜'},

  {text:'寶寶的耳朵小小的', sounds:'ㄅㄠˇ ㄅㄠ˙ ㄉㄜ˙ ㄦˇ ㄉㄨㄛ˙ ㄒㄧㄠˇ ㄒㄧㄠˇ ㄉㄜ˙', focus:'老師答案：輕聲／連續三聲／一不'},
  {text:'我的嘴巴在吃飯', sounds:'ㄨㄛˇ ㄉㄜ˙ ㄗㄨㄟˇ ㄅㄚ˙ ㄗㄞˋ ㄔ ㄈㄢˋ', focus:'老師答案：輕聲／連續三聲／一不'},
  {text:'小貓在桌子底下', sounds:'ㄒㄧㄠˇ ㄇㄠ ㄗㄞˋ ㄓㄨㄛ ㄗ˙ ㄉㄧˇ ㄒㄧㄚˋ', focus:'老師答案：輕聲／連續三聲／一不'},
  {text:'我向老師說你好', sounds:'ㄨㄛˇ ㄒㄧㄤˋ ㄌㄠˇ ㄕ ㄕㄨㄛ ㄋㄧˇ ㄏㄠˇ', focus:'老師答案：輕聲／連續三聲／一不'},
  {text:'我要一杯水', sounds:'ㄨㄛˇ ㄧㄠˋ ㄧˋ ㄅㄟ ㄕㄨㄟˇ', focus:'老師答案：輕聲／連續三聲／一不'},
  {text:'我們一起畫小鳥', sounds:'ㄨㄛˇ ㄇㄣ˙ ㄧˋ ㄑㄧˇ ㄏㄨㄚˋ ㄒㄧㄠˇ ㄋㄧㄠˇ', focus:'老師答案：輕聲／連續三聲／一不'},
  {text:'這不是我的書包', sounds:'ㄓㄜˋ ㄅㄨˊ ㄕˋ ㄨㄛˇ ㄉㄜ˙ ㄕㄨ ㄅㄠ', focus:'老師答案：輕聲／連續三聲／一不'},
];
