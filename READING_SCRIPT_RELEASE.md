# Traditional Chinese recognition and grading

The cloud recognizer now receives a generic Traditional Chinese style prompt. No target answer, word list or student identity is sent to the model. Known simplified and mixed-script spellings are mapped to the existing traditional whole-word answer; the full 1,237-word bank is covered. The generated spelling data uses opencc-js 1.4.2 and opencc-data; notices are in licenses/. It does not substitute vocabulary or accept approximate pronunciation.

Romanization such as the reported `Múma`, digits and mixed Latin/Chinese results leave the current question ungraded for another recording. They are not automatically correct. Existing same-pronunciation Chinese aliases and whole-word grading remain. Targets, successful feedback and review use Traditional Chinese. Wrong Chinese words still count as incorrect. Awards remain 5/5 = three stars, 3–4/5 = one star.

Validation: 33 targeted tests passed, including every generated spelling, wrong-word rejection, retry classification, microphone release, cloud quota/authentication and native speech behavior. An isolated browser fixture returned Múma for 木馬, kept question one available, then returned five simplified words; the resulting round had five correct answers and three stars, with no audio in the saved payload. This is an integration simulation, not a physical iPad test.

Actual cloud inference with the new prompt returned correct Traditional Chinese for all five existing synthetic Mandarin clips (蘋果、學校、長頸鹿、開開心心、五顏六色). The sixth, silent clip returned HTTP 400 / code 3030, so the evaluation stopped; the application's existing pre-inference silence gate remains required and is tested separately. Five synthetic clips do not establish children's speech or tone accuracy.

Release marker: 20260930-script1, visible label cloud2. Speech Worker version: 72d020e5-7698-4252-bece-da7041353372. No schema, student records or previously awarded scores were changed.

## Reviewed lake homophones (cloud3)

The teacher reported 湖泊 transcribed as 胡博. The existing matcher shared aliases only among vocabulary entries and did not know this transcription. The full pronunciation ㄏㄨˊ ㄅㄛˊ now also accepts 胡博、胡泊、湖博, including normal punctuation. The displayed correct answer remains 湖泊. Different tones/syllables (胡波、虎博、湖坡), extra words, repeated words and incomplete responses still fail; romanization still retries without grading. No character-wide fuzzy substitution was added.

Readings verified against the Ministry of Education: [湖泊](https://dict.concised.moe.edu.tw/dictView.jsp?ID=19918&la=0&powerMode=0), [博](https://dict.concised.moe.edu.tw/dictView.jsp?ID=191&q=1), and 胡 in the [Chinese transliteration principles surname table](https://language.moe.gov.tw/001/Upload/FileUpload/3692-16962/Documents/pinyinshouce.pdf).

Frontend marker: 20260930-homophone1, visible label cloud3. Worker and stored scores are unchanged. The 34 targeted tests include the reported spelling and negative cases.
