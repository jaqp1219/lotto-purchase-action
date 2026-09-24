/**
 * 04. Gemini 추천 번호 예제
 *
 * GEMINI_API_KEY 환경변수가 필요합니다.
 * Gemini가 추천한 번호 1게임을 수동 구매합니다.
 * 응답이 비어 있거나 형식이 맞지 않으면 FALLBACK_NUMBERS를 사용합니다.
 *
 * 필요 설정:
 * - GitHub Secrets에 GEMINI_API_KEY 추가 필요
 * - workflow yml에서 env: GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }} 설정
 *
 * 이 실행이 끝나면 구매 결과는 GitHub Issue 1개로 정리됩니다.
 */
const MODEL = 'gemini-3.6-flash';
const FALLBACK_NUMBERS = [3, 7, 12, 23, 31, 42];

export default async ({ purchaseManual }) => {
  console.log('=== 04-gemini-recommendation 시작 ===');

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY가 없습니다. workflow env에 secrets.GEMINI_API_KEY를 연결해 주세요.');
  }

  let numbers = FALLBACK_NUMBERS;

  try {
    const recommended = await requestGeminiNumbers();
    if (recommended) {
      numbers = recommended;
      console.log('Gemini 추천 번호를 사용합니다:', numbers);
    } else {
      console.log('Gemini 응답을 해석하지 못해 기본 번호를 사용합니다:', numbers);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Gemini 호출에 실패해 기본 번호를 사용합니다: ${message}`);
  }

  const purchased = await purchaseManual([numbers]);
  console.log('구매 완료:', purchased);
};

async function requestGeminiNumbers() {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      "system_instruction": {
        "parts": [
          {"text": "당신은 로또 번호 추천 시스템입니다. 다른 인사말, 설명, 마크다운, 추가 텍스트를 절대 출력하지 말고 오직 요청받은 표준 형식의 배열 문자열만 반환하세요."}
        ]
      },
      "contents": [
        {
          "parts": [
            {
              "text": "최근 2년치의 로또 당첨 번호를 기반으로 당첨 확률이 높을 것 같은 이번주 번호를 추천해줘.\n조합 1. 핫 넘버 중심 (자주 나오는 상승세 조합)\n조합 2. 밸런스 조합 (자주 나온 번호 + 미출현 번호)\n위 2가지를 추천해주는데 답변은 아래와 같이 쉼표로 구분된 배열로 부탁해.\n예: [[3, 7, 12, 23, 31, 42], [1, 2, 3, 4, 5, 6]]"
            }
          ]
        }
      ],
      "generationConfig": {
        "temperature": 0.2
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API 요청 실패 (${response.status})`);
  }

  const data = await response.json();
  const text =
    data.candidates
      ?.flatMap(candidate => candidate.content?.parts ?? [])
      .map(part => part.text ?? '')
      .join('\n') ?? '';

  console.log('Gemini 응답:', text);

  return parseRecommendedNumbers(text);
}

function parseRecommendedNumbers(text) {
  const numbers = text
    .match(/\d+/g)
    ?.map(Number)
    .filter(num => num >= 1 && num <= 45);

  if (!numbers) {
    return null;
  }

  const uniqueNumbers = [...new Set(numbers)].slice(0, 6).sort((a, b) => a - b);

  if (uniqueNumbers.length !== 6) {
    return null;
  }

  return uniqueNumbers;
}
