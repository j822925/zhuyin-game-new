// Full-score-only cards. Never merge into the ordinary gacha/redeem catalog.
export const STAR_CARDS=[
  {
    "id": "star-01-bo",
    "symbol": "ㄅ",
    "name": "爆星騎士",
    "image": "assets/characters/star-envoy-cards/batch-01/01-bo-爆星騎士-v1.png"
  },
  {
    "id": "star-02-po",
    "symbol": "ㄆ",
    "name": "泡光領航員",
    "image": "assets/characters/star-envoy-cards/batch-01/02-po-泡光領航員-v1.png"
  },
  {
    "id": "star-03-mo",
    "symbol": "ㄇ",
    "name": "萌芽機巧師",
    "image": "assets/characters/star-envoy-cards/batch-01/03-mo-萌芽機巧師-v1.png"
  },
  {
    "id": "star-04-fo",
    "symbol": "ㄈ",
    "name": "緋羽舞者",
    "image": "assets/characters/star-envoy-cards/batch-01/04-fo-緋羽舞者-v1.png"
  },
  {
    "id": "star-05-de",
    "symbol": "ㄉ",
    "name": "電光滑板手",
    "image": "assets/characters/star-envoy-cards/batch-01/05-de-電光滑板手-v1.png"
  },
  {
    "id": "star-06-te",
    "symbol": "ㄊ",
    "name": "糖晶守護者",
    "image": "assets/characters/star-envoy-cards/batch-01/06-te-糖晶守護者-v1.png"
  },
  {
    "id": "star-07-ne",
    "symbol": "ㄋ",
    "name": "霓虹塗鴉師",
    "image": "assets/characters/star-envoy-cards/batch-02/07-ne-霓虹塗鴉師-v1.png"
  },
  {
    "id": "star-08-le",
    "symbol": "ㄌ",
    "name": "流星弓手",
    "image": "assets/characters/star-envoy-cards/batch-02/08-le-流星弓手-v2.png"
  },
  {
    "id": "star-09-ge",
    "symbol": "ㄍ",
    "name": "光輪賽車手",
    "image": "assets/characters/star-envoy-cards/batch-02/09-ge-光輪賽車手-v1.png"
  },
  {
    "id": "star-10-ke",
    "symbol": "ㄎ",
    "name": "空島探險家",
    "image": "assets/characters/star-envoy-cards/batch-02/10-ke-空島探險家-v1.png"
  },
  {
    "id": "star-11-he",
    "symbol": "ㄏ",
    "name": "幻霧魔術師",
    "image": "assets/characters/star-envoy-cards/batch-02/11-he-幻霧魔術師-v1.png"
  },
  {
    "id": "star-12-ji",
    "symbol": "ㄐ",
    "name": "極光劍姬",
    "image": "assets/characters/star-envoy-cards/batch-02/12-ji-極光劍姬-v1.png"
  },
  {
    "id": "star-13-qi",
    "symbol": "ㄑ",
    "name": "晴空飛行員",
    "image": "assets/characters/star-envoy-cards/batch-03/13-qi-晴空飛行員-v1.png"
  },
  {
    "id": "star-14-xi",
    "symbol": "ㄒ",
    "name": "星河織夢師",
    "image": "assets/characters/star-envoy-cards/batch-03/14-xi-星河織夢師-v1.png"
  },
  {
    "id": "star-15-zhi",
    "symbol": "ㄓ",
    "name": "智慧書靈",
    "image": "assets/characters/star-envoy-cards/batch-03/15-zhi-智慧書靈-v1.png"
  },
  {
    "id": "star-16-chi",
    "symbol": "ㄔ",
    "name": "赤焰鼓王",
    "image": "assets/characters/star-envoy-cards/batch-03/16-chi-赤焰鼓王-v1.png"
  },
  {
    "id": "star-17-shi",
    "symbol": "ㄕ",
    "name": "霜雪馴獸師",
    "image": "assets/characters/star-envoy-cards/batch-03/17-shi-霜雪馴獸師-v1.png"
  },
  {
    "id": "star-18-ri",
    "symbol": "ㄖ",
    "name": "日曜花冠使",
    "image": "assets/characters/star-envoy-cards/batch-03/18-ri-日曜花冠使-v2.png"
  },
  {
    "id": "lesson-01-pai",
    "symbol": "拍",
    "name": "拍光節奏使",
    "image": "assets/characters/expansion-20261123/lesson-01-pai.webp",
    "series": "hanzi",
    "hiddenUntilOwned": true
  },
  {
    "id": "lesson-02-fen",
    "symbol": "分",
    "name": "分果小使者",
    "image": "assets/characters/expansion-20261123/lesson-02-fen.webp",
    "series": "hanzi",
    "hiddenUntilOwned": true
  },
  {
    "id": "lesson-03-hai",
    "symbol": "海",
    "name": "碧海領航使",
    "image": "assets/characters/expansion-20261123/lesson-03-hai.webp",
    "series": "hanzi",
    "hiddenUntilOwned": true
  },
  {
    "id": "lesson-04-wa",
    "symbol": "蛙",
    "name": "翠潭蛙騎士",
    "image": "assets/characters/expansion-20261123/lesson-04-wa.webp",
    "series": "hanzi",
    "hiddenUntilOwned": true
  },
  {
    "id": "lesson-05-wang",
    "symbol": "王",
    "name": "晨冠小王子",
    "image": "assets/characters/expansion-20261123/lesson-05-wang.webp",
    "series": "hanzi",
    "hiddenUntilOwned": true
  },
  {
    "id": "lesson-06-hua",
    "symbol": "花",
    "name": "百花織夢使",
    "image": "assets/characters/expansion-20261123/lesson-06-hua.webp",
    "series": "hanzi",
    "hiddenUntilOwned": true
  }
];

export const starCardName = card => card.series === "hanzi" ? card.name : card.symbol + "之星使・" + card.name;
