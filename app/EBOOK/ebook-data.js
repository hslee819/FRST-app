(function (root) {
  'use strict';

  // 교재 제목·회차는 제공된 화면을 참고했습니다. 지문·문항·통계는 직접 작성한 예시입니다.
  const subjects = ['국어', '수학', '영어', '물리학Ⅱ', '사회문화', '한국사'];
  const demoNotice = {
    isDemo: true,
    content: '지문·문항·정답·해설은 기능 확인을 위해 작성한 예시이며 실제 교재 내용이 아닙니다.',
    statistics: '선지별 선택 비율은 예시 데이터이며 실제 재원생 통계가 아닙니다.',
    library: '국어 외 과목의 교재 목록은 화면 구성을 위한 예시입니다.'
  };
  const books = [];
  const logParts = [
    ['01', '수능 만점자의 1년', '성적 우수자의 공부 몰입도', '6평을 위한 항해지도', '상반기 콘텐츠 추천', '실수와 보완법'],
    ['02', '국수탐 만점자의 1년', '9평을 위한 항해지도', '하반기 콘텐츠 추천']
  ];
  logParts.forEach(function (issueParts) {
    const issue = issueParts[0];
    issueParts.slice(1).forEach(function (title, index) {
      books.push({
        id: 'log-' + issue + '-part-' + (index + 1), kind: 'log', subject: '항해일지',
        type: 'log', title: '항해일지', issue: issue, subtitle: 'Part ' + (index + 1) + '. ' + title,
        updated: '2026-09-14', pages: 15, available: true, completed: false, seconds: 0,
        color: issue === '01' ? '#8586ab' : '#709fb3', demo: true
      });
    });
  });

  function addWorkbook(id, subject, type, issue, updated, options) {
    const config = options || {};
    const names = { survival: '서바이벌', accelerator: '엑셀러레이터', monthly: '월례고사' };
    books.push({
      id: id, kind: 'workbook', subject: subject, type: type, title: names[type],
      issue: String(issue), subtitle: config.demo ? '화면 구성용 예시 교재' : '개별 문항 풀이',
      updated: updated, pages: 45, available: config.available !== false,
      completed: Boolean(config.completed), seconds: config.seconds || 0,
      color: type === 'accelerator' ? '#3c62b1' : type === 'monthly' ? '#626a60' : '#9fa58d',
      demo: true, demoLibrary: Boolean(config.demo)
    });
  }
  addWorkbook('korean-survival-18', '국어', 'survival', '18', '2026-11-02', { available: false });
  addWorkbook('korean-accelerator-29', '국어', 'accelerator', '29', '2026-11-02', { available: false });
  addWorkbook('korean-monthly-10', '국어', 'monthly', '10', '2026-10-28');
  addWorkbook('korean-survival-17', '국어', 'survival', '17', '2026-10-26', { completed: true, seconds: 17 });
  addWorkbook('korean-accelerator-28', '국어', 'accelerator', '28', '2026-10-26');
  addWorkbook('korean-survival-16', '국어', 'survival', '16', '2026-10-19', { completed: true, available: false });
  addWorkbook('korean-accelerator-27', '국어', 'accelerator', '27', '2026-10-19', { available: false });
  addWorkbook('math-survival-18', '수학', 'survival', '18', '2026-11-02', { demo: true });
  addWorkbook('math-accelerator-29', '수학', 'accelerator', '29', '2026-11-02', { demo: true });
  addWorkbook('english-survival-18', '영어', 'survival', '18', '2026-11-02', { demo: true });
  addWorkbook('physics-survival-18', '물리학Ⅱ', 'survival', '18', '2026-11-02', { demo: true });
  addWorkbook('social-survival-18', '사회문화', 'survival', '18', '2026-11-02', { demo: true });
  addWorkbook('history-monthly-10', '한국사', 'monthly', '10', '2026-10-28', { demo: true });

  function template(prompt, passage, choices, answer, explanation, tags) {
    return { prompt: prompt, passage: passage, choices: choices, answer: answer, explanation: explanation, tags: tags };
  }
  const koreanTemplates = [
    template('윗글을 바탕으로 추론한 내용으로 가장 적절한 것은?',
      '같은 글을 반복해서 읽으면 내용이 익숙하게 느껴진다. 그러나 익숙함이 곧 이해를 뜻하지는 않는다. 책을 덮은 뒤 핵심 내용을 자신의 말로 설명하면 이해하지 못한 부분을 발견할 수 있다. 발견한 빈틈을 다시 확인하는 과정이 복습의 출발점이 된다.',
      ['익숙한 내용은 설명할 필요가 없다.', '반복해서 읽으면 언제나 모든 내용을 이해하게 된다.', '스스로 설명해 보는 활동은 이해의 빈틈을 찾는 데 도움이 된다.', '복습은 처음부터 끝까지 같은 속도로 읽을 때만 가능하다.', '핵심 내용을 기억하지 못해도 이해한 것으로 볼 수 있다.'],
      3, '글은 익숙함과 이해를 구분하고, 책을 덮고 자신의 말로 설명하는 활동으로 이해의 빈틈을 찾을 수 있다고 말한다. 따라서 ③이 적절하다. ④의 ‘같은 속도로 읽을 때만’이라는 제한은 지문에 없다.', ['독서', '내용 추론']),
    template('윗글의 중심 내용으로 가장 적절한 것은?',
      '계획에 빈칸이 없다고 해서 실행이 잘되는 것은 아니다. 예상보다 오래 걸리는 과제가 생길 수 있기 때문이다. 하루의 일부를 여유 시간으로 남겨 두면 지연된 과제를 마무리하고 다음 계획을 조정할 수 있다.',
      ['계획에는 예상하지 못한 상황에 대응할 여유가 필요하다.', '모든 과제는 같은 시간이 걸린다.', '일정이 지연되면 모든 계획을 포기해야 한다.', '여유 시간에는 새로운 과제만 해야 한다.', '계획은 자세할수록 반드시 성공한다.'],
      1, '지연되는 과제를 처리하고 계획을 조정하기 위해 여유 시간을 두자는 글이다. ①이 글 전체를 포괄한다.', ['독서', '중심 내용']),
    template('윗글의 설명 방식으로 가장 적절한 것은?',
      '메모 A는 문제의 정답만 적어 두었다. 메모 B는 정답과 함께 잘못 판단한 근거, 다음에 확인할 조건을 적었다. A로는 결과를 확인할 수 있지만, B로는 생각의 어느 지점을 바꿔야 하는지도 확인할 수 있다.',
      ['어휘의 어원을 분석하고 있다.', '일어난 사건을 시간 순서대로 나열하고 있다.', '대상의 크기를 수치로 계산하고 있다.', '두 사례를 비교하여 기록 내용의 차이를 드러내고 있다.', '전문가의 말을 인용하여 권위를 강조하고 있다.'],
      4, '정답만 기록한 A와 판단 근거까지 기록한 B를 비교한다. 그 차이를 통해 기록의 역할을 설명하므로 ④가 적절하다.', ['독서', '설명 방식']),
    template('윗글에서 말하는 ‘점검’의 사례로 가장 적절한 것은?',
      '점검은 끝낸 과제의 수만 세는 일이 아니다. 처음 세운 목표와 실제 결과를 비교하고, 차이가 생긴 이유를 확인하는 일이다. 그 이유가 다음 계획에 반영될 때 기록은 학습을 조절하는 자료가 된다.',
      ['친구의 과제 수를 그대로 목표로 삼는다.', '예상 시간과 실제 시간을 비교하고 지연 원인을 다음 계획에 반영한다.', '끝낸 과제 수를 확인한 뒤 기록을 지운다.', '목표와 관계없이 새 문제집을 고른다.', '모든 과제의 시간을 같게 바꾼다.'],
      2, '목표와 실제 결과를 비교하고 차이의 원인을 다음 계획에 반영하는 ②가 지문의 점검에 해당한다.', ['독서', '사례 적용']),
    template('윗글을 이해한 내용으로 적절하지 않은 것은?',
      '질문을 만들 때에는 막힌 위치를 구체적으로 적는 편이 좋다. 자신이 사용한 조건과 거기서 도출한 판단을 함께 적으면 상대방은 풀이의 흐름을 파악할 수 있다. 이 기록은 답변을 받은 뒤 자신의 판단을 다시 살펴보는 데에도 쓰인다.',
      ['막힌 위치를 구체적으로 기록하면 좋다.', '풀이에 사용한 조건을 질문에 포함할 수 있다.', '자신이 도출한 판단도 질문의 자료가 된다.', '질문 기록은 답변을 받은 뒤에도 활용할 수 있다.', '답변을 받으려면 자신의 풀이 과정은 반드시 숨겨야 한다.'],
      5, '글에서는 사용한 조건과 판단을 함께 적으라고 권한다. 풀이 과정을 반드시 숨겨야 한다는 ⑤는 글의 내용과 반대이다.', ['독서', '내용 일치']),
    template('윗글에 제목을 붙인 것으로 가장 적절한 것은?',
      '문제를 틀렸다는 사실만으로 같은 실수가 반복되는 이유를 알 수는 없다. 조건을 놓친 것인지, 계산을 잘못한 것인지, 개념을 혼동한 것인지 구분해야 한다. 이유에 따라 다시 읽기, 계산 검산, 개념 비교처럼 다음 행동도 달라진다.',
      ['문제 수가 정하는 학습의 질', '정답을 빠르게 외우는 방법', '오답의 원인에서 찾는 다음 행동', '모든 실수를 해결하는 한 가지 방법', '계산 연습만으로 끝내는 복습'],
      3, '오답 원인을 구분하고 그 원인에 맞는 행동을 정하자는 글이다. 이를 함께 담은 제목은 ③이다.', ['독서', '제목 찾기'])
  ];

  function mathTemplate(number) {
    const unit = Math.floor((number - 1) / 6) + 1;
    switch ((number - 1) % 6) {
      case 0: {
        const x = unit + 3;
        return template('방정식을 만족하는 x의 값은?', '2x + 3 = ' + (2 * x + 3),
          [String(x - 2), String(x - 1), String(x), String(x + 1), String(x + 2)], 3,
          '양변에서 3을 빼면 2x = ' + (2 * x) + '이다. 양변을 2로 나누면 x = ' + x + '이다.', ['방정식', '일차방정식']);
      }
      case 1: {
        const value = 3 * unit + 2;
        return template('함숫값 f(' + unit + ')는?', '함수 f(x) = 3x + 2이다.',
          [String(value), String(value + 1), String(value + 2), String(value + 3), String(value + 4)], 1,
          'x에 ' + unit + '을 대입하면 f(' + unit + ') = 3 × ' + unit + ' + 2 = ' + value + '이다.', ['함수', '함숫값']);
      }
      case 2: {
        const value = 2 + 3 * (unit + 2);
        return template('다음 등차수열의 제' + (unit + 3) + '항은?', '첫째항이 2이고 공차가 3인 등차수열이다.',
          [String(value - 3), String(value - 2), String(value - 1), String(value), String(value + 1)], 4,
          '제n항은 2 + 3(n − 1)이다. n = ' + (unit + 3) + '을 대입하면 ' + value + '이다.', ['수열', '등차수열']);
      }
      case 3: {
        const value = unit + 2;
        return template('세 수의 산술평균은?', '세 수는 ' + unit + ', ' + (unit + 2) + ', ' + (unit + 4) + '이다.',
          [String(value - 1), String(value), String(value + 1), String(value + 2), String(value + 3)], 2,
          '세 수를 더한 ' + (3 * value) + '를 개수 3으로 나누면 산술평균은 ' + value + '이다.', ['자료 해석', '평균']);
      }
      case 4: {
        const value = (unit + 2) * 4;
        return template('직사각형의 넓이는?', '가로 길이가 ' + (unit + 2) + ' cm, 세로 길이가 4 cm인 직사각형이다.',
          [String(value - 8) + ' cm²', String(value - 6) + ' cm²', String(value - 4) + ' cm²', String(value - 2) + ' cm²', String(value) + ' cm²'], 5,
          '직사각형의 넓이는 가로 × 세로이므로 ' + (unit + 2) + ' × 4 = ' + value + ' cm²이다.', ['도형', '넓이']);
      }
      default: {
        const value = 2 * unit;
        return template('함수 f(x)의 x = ' + unit + '에서의 미분계수는?', 'f(x) = x²이며, 도함수는 f′(x) = 2x이다.',
          [String(value - 2), String(value - 1), String(value), String(value + 1), String(value + 2)], 3,
          '도함수 f′(x) = 2x에 x = ' + unit + '을 대입하면 f′(' + unit + ') = ' + value + '이다.', ['미분', '미분계수']);
      }
    }
  }

  const englishTemplates = [
    template('글의 내용과 일치하는 것은?', 'Mina studies at the library every Saturday. Before she leaves, she writes down one question to ask her teacher on Monday.',
      ['Mina never visits the library.', 'Mina asks her teacher a question every Saturday.', 'Mina prepares a question before leaving the library.', 'Mina studies only on Monday.', 'Mina writes questions for her classmates.'], 3,
      'Before she leaves, she writes down one question이라고 했으므로 도서관을 떠나기 전에 질문을 준비한다는 ③이 일치한다.', ['영어', '내용 일치']),
    template('빈칸에 들어갈 말로 가장 적절한 것은?', 'I was tired, _____ I took a short break and then returned to my work.',
      ['so', 'or', 'although', 'unless', 'before'], 1,
      '피곤했다는 원인과 잠깐 쉬었다는 결과를 연결하므로 so가 적절하다.', ['영어', '연결어']),
    template('글의 주제로 가장 적절한 것은?', 'A large task can feel difficult to begin. Dividing it into smaller steps gives you a clear place to start. Completing the first step can help you continue.',
      ['Why all tasks take the same time', 'The value of avoiding difficult work', 'How to finish work without a plan', 'Making a large task easier to start', 'Why starting early is impossible'], 4,
      '큰 과제를 작은 단계로 나누어 시작하기 쉽게 만드는 방법을 설명하므로 ④가 주제로 적절하다.', ['영어', '주제']),
    template('밑줄 친 표현을 우리말로 옮긴 것으로 가장 적절한 것은?', 'Please check your answer once more. In this sentence, “once more” means _____.',
      ['아주 드물게', '한 번 더', '전혀 없이', '지난해에', '가능한 한 빨리'], 2,
      'once more는 again과 같은 뜻으로, ‘한 번 더’를 의미한다.', ['영어', '어휘']),
    template('글의 내용으로 알 수 없는 것은?', 'The reading club meets in Room 3 on Fridays. Each meeting begins at four and lasts for one hour. Members bring a book of their choice.',
      ['모임 장소', '모임 요일', '시작 시간', '모임의 길이', '회원의 정확한 수'], 5,
      '장소·요일·시작 시간·진행 시간과 준비물은 제시되어 있지만 회원 수는 언급되어 있지 않다.', ['영어', '정보 확인'])
  ];

  const physicsTemplates = [
    template('물체의 속력은?', '물체가 일정한 속력으로 12 m를 3 s 동안 이동했다. 속력은 이동 거리 ÷ 걸린 시간으로 구한다.',
      ['2 m/s', '3 m/s', '4 m/s', '6 m/s', '9 m/s'], 3, '12 m ÷ 3 s = 4 m/s이므로 ③이다.', ['물리학Ⅱ', '운동']),
    template('물체에 작용하는 알짜힘의 크기는?', '질량 2 kg인 물체의 가속도가 3 m/s²이다. 알짜힘 F = ma를 이용한다.',
      ['6 N', '2 N', '3 N', '5 N', '9 N'], 1, 'F = ma = 2 × 3 = 6 N이다.', ['물리학Ⅱ', '힘']),
    template('저항에 흐르는 전류의 세기는?', '저항 4 Ω에 전압 12 V를 걸었다. 전류 I = V/R을 이용한다.',
      ['0.5 A', '1 A', '2 A', '3 A', '4 A'], 4, 'I = V/R = 12/4 = 3 A이다.', ['물리학Ⅱ', '전기']),
    template('힘이 물체에 한 일은?', '이동 방향으로 일정한 힘 5 N을 가하여 물체를 2 m 이동시켰다. 일 W = Fd를 이용한다.',
      ['5 J', '10 J', '15 J', '20 J', '25 J'], 2, '힘과 이동 방향이 같으므로 W = Fd = 5 × 2 = 10 J이다.', ['물리학Ⅱ', '일과 에너지']),
    template('파동의 진행 속력은?', '파장이 2 m, 진동수가 5 Hz인 파동이다. 진행 속력 v = fλ를 이용한다.',
      ['2 m/s', '4 m/s', '5 m/s', '8 m/s', '10 m/s'], 5, 'v = fλ = 5 × 2 = 10 m/s이다.', ['물리학Ⅱ', '파동'])
  ];

  const socialTemplates = [
    template('이 조사에 대한 설명으로 가장 적절한 것은?', '연구자는 학생들의 통학 시간을 알아보기 위해 같은 문항으로 구성된 설문지를 100명에게 배부했다. 응답은 분 단위 숫자로 정리했다.',
      ['모든 학생을 반드시 관찰했다.', '통학 시간을 과학적으로 조사할 수는 없다.', '동일한 문항을 사용하여 비교 가능한 응답을 수집했다.', '응답자의 통학 이유를 모두 확인했다.', '조사 결과를 제시하지 않아도 전국 평균을 확정할 수 있다.'], 3,
      '동일한 질문과 분 단위의 응답 형식을 사용했으므로 응답을 서로 비교할 수 있다. 전국 평균이나 모든 통학 이유까지 알 수 있다는 근거는 없다.', ['사회문화', '자료 수집']),
    template('자료를 바르게 해석한 것은?', '가상의 설문에서 50명 중 30명이 버스, 15명이 도보, 5명이 자전거를 주된 통학 수단으로 답했다. 각 사람은 하나만 선택했다.',
      ['버스를 선택한 비율은 60%이다.', '도보를 선택한 비율은 50%이다.', '자전거를 선택한 비율은 20%이다.', '도보 응답이 버스 응답보다 많다.', '응답자 수는 60명이다.'], 1,
      '버스 응답 30명을 전체 50명으로 나누면 0.6이므로 60%이다.', ['사회문화', '자료 해석']),
    template('다음 연구에서 비교하려는 것은?', '두 학급에 같은 읽기 자료를 제공했다. A반은 혼자 읽고, B반은 읽은 뒤 짝과 토론했다. 이후 같은 이해도 문항에 답하도록 했다.',
      ['교실 크기에 따른 이동 거리', '통학 수단과 수면 시간의 관계', '두 자료의 글자 수 차이', '토론 여부에 따른 이해도 차이', '학급 명칭에 따른 출석률'], 4,
      '읽기 자료와 이해도 문항은 같고 읽은 뒤 토론하는지 여부가 다르므로 토론 여부에 따른 이해도 차이를 비교한다.', ['사회문화', '연구 설계']),
    template('조사 결과를 해석할 때 필요한 태도로 가장 적절한 것은?', '학교 전체의 급식 만족도를 알아보려는 조사에 한 동아리 학생만 참여했다.',
      ['참여자가 적을수록 반드시 더 정확하다고 본다.', '참여 집단이 학교 전체를 잘 대표하는지 살펴본다.', '동아리 응답을 전국 학생의 응답으로 간주한다.', '조사 대상과 결론의 범위는 관계없다고 본다.', '조사하지 않은 학생도 모두 같은 의견이라고 정한다.'], 2,
      '한 동아리의 학생들이 학교 전체의 의견을 대표하는지는 별도로 검토해야 한다. 따라서 ②가 적절하다.', ['사회문화', '표본']),
    template('자료만으로 단정할 수 없는 것은?', '한 학급의 익명 조사에서 하루 독서 시간과 어휘 평가 점수 사이에 같은 방향의 경향이 관찰되었다. 다른 조건은 조사하지 않았다.',
      ['두 변인을 조사했다.', '조사는 한 학급에서 이루어졌다.', '조사는 익명으로 진행되었다.', '다른 조건은 조사하지 않았다.', '독서 시간이 점수 변화의 유일한 원인이다.'], 5,
      '두 변인 사이의 경향만으로 유일한 원인을 확정할 수 없다. 다른 조건을 조사하지 않았으므로 ⑤는 자료를 넘어선 단정이다.', ['사회문화', '인과 해석'])
  ];

  const historyTemplates = [
    template('자료를 읽는 태도로 가장 적절한 것은?', '역사 동아리의 자료 읽기 안내: “기록을 읽을 때에는 누가, 언제, 어떤 목적으로 썼는지 살펴보자. 같은 사건의 다른 기록과 비교하면 각 자료가 담지 못한 부분도 확인할 수 있다.”',
      ['작성 목적은 언제나 무시한다.', '한 자료만으로 모든 사실을 확정한다.', '자료의 작성 배경을 살피고 다른 자료와 비교한다.', '오래된 기록은 모두 거짓으로 취급한다.', '작성 시기는 자료 이해와 무관하다.'], 3,
      '작성자·시기·목적을 살피고 다른 기록과 비교하라는 안내이므로 ③이 적절하다.', ['한국사', '사료 읽기']),
    template('연표의 시간 순서를 바르게 정리한 것은?', '연표 읽기 예시: 사건 A는 1894년, 사건 B는 1919년, 사건 C는 1945년에 일어났다고 제시되어 있다. 사건 이름은 생략한 연습 자료이다.',
      ['A → B → C', 'A → C → B', 'B → A → C', 'B → C → A', 'C → B → A'], 1,
      '1894 < 1919 < 1945이므로 시간 순서는 A → B → C이다. 실제 사건을 특정하는 문제가 아닌 연표 읽기 예시이다.', ['한국사', '연표']),
    template('두 자료를 비교하며 확인할 내용으로 가장 적절한 것은?', '같은 지역의 변화를 보여 주는 서로 다른 시기의 지도 두 장을 받았다. 지도에는 제작 연도, 축척, 도로와 하천이 표시되어 있다.',
      ['제작 연도는 확인하지 않는다.', '지도의 종이 색만 비교한다.', '축척과 무관하게 선의 길이를 그대로 비교한다.', '제작 연도와 축척을 확인한 뒤 도로의 변화를 비교한다.', '지도에는 시간에 따른 변화가 전혀 담기지 않는다.'], 4,
      '시간에 따른 지역 변화를 비교하려면 제작 연도와 축척을 먼저 확인해야 한다. 그 뒤 도로 등 구체적인 요소를 비교할 수 있다.', ['한국사', '지도 자료']),
    template('다음 자료만으로 확인할 수 있는 것은?', '가상의 전시 설명: “이 일기는 1930년에 작성되었으며, 당시 한 학생의 학교생활을 담고 있다. 필자의 이름은 확인되지 않았다.”',
      ['필자의 정확한 이름', '일기에 학교생활이 담겨 있다는 사실', '당시 모든 학생의 의견', '일기가 쓰인 정확한 시간', '필자의 이후 생애 전체'], 2,
      '설명에는 1930년에 쓰인 일기에 학교생활이 담겨 있다고 제시되어 있다. 나머지 정보는 확인할 수 없다.', ['한국사', '자료 확인']),
    template('다음 탐구 활동의 결과로 단정하기 어려운 것은?', '학생들이 한 장터의 옛 사진 두 장을 비교했다. 사진에는 가게 간판과 거리 모습이 보였지만 촬영 범위 밖의 모습은 나오지 않았다.',
      ['사진에 가게 간판이 보인다.', '사진에 거리 모습이 담겨 있다.', '비교한 사진은 두 장이다.', '사진에는 촬영 범위의 한계가 있다.', '이 사진만으로 전국 모든 장터의 모습을 알 수 있다.'], 5,
      '한 장터의 일부를 촬영한 사진 두 장만으로 전국 모든 장터의 모습을 일반화할 수 없다.', ['한국사', '자료의 한계'])
  ];

  const templateSets = { '국어': koreanTemplates, '영어': englishTemplates, '물리학Ⅱ': physicsTemplates, '사회문화': socialTemplates, '한국사': historyTemplates };
  const questionCache = new Map();
  function getBook(id) { return books.find(function (book) { return book.id === id; }) || null; }
  function ratiosFor(answer) {
    const base = [4.8, 12.1, 67.5, 12.9, 2.7];
    const ratios = new Array(5);
    base.forEach(function (value, index) { ratios[(index + answer - 3 + 5) % 5] = value; });
    return ratios;
  }
  function getQuestions(bookId) {
    const book = getBook(bookId);
    if (!book || book.kind !== 'workbook') return [];
    if (!questionCache.has(bookId)) {
      const questions = Array.from({ length: 45 }, function (_, index) {
        const number = index + 1;
        const set = templateSets[book.subject];
        const source = book.subject === '수학' ? mathTemplate(number) : set[index % set.length];
        return {
          id: bookId + '-q' + number, bookId: bookId, subject: book.subject, number: number,
          prompt: source.prompt, passage: source.passage, choices: source.choices.slice(),
          answer: source.answer, explanation: source.explanation, tags: source.tags.slice(),
          points: number <= 35 ? 2 : 3, ratios: ratiosFor(source.answer),
          isDemo: true, statisticsLabel: '학생 선택 비율 · 예시'
        };
      });
      questionCache.set(bookId, questions);
    }
    return questionCache.get(bookId);
  }
  function getQuestion(bookId, number) {
    const n = Number(number);
    return Number.isInteger(n) && n >= 1 && n <= 45 ? getQuestions(bookId)[n - 1] || null : null;
  }
  function allQuestions() {
    return books.reduce(function (items, book) { return items.concat(getQuestions(book.id)); }, []);
  }

  const articles = [
    ['목표를 작은 행동으로 바꾸기', '이번 주 목표를 적었다면 오늘 시작할 수 있는 크기로 나누어 보자. 큰 목표는 방향을 정하고, 작은 행동은 그 방향으로 움직이게 한다.', '“독서를 더 잘하기”보다 “한 지문의 중심 문장을 찾아 설명하기”처럼 끝났는지 확인할 수 있는 행동을 적어 보자.', '하루가 끝나면 완료한 행동과 어려웠던 부분을 함께 기록한다. 다음 계획은 그 기록에서 출발한다.'],
    ['읽은 뒤에는 잠깐 멈추기', '한 단락을 읽은 뒤 잠깐 시선을 떼고 무엇을 읽었는지 자신의 말로 정리해 보자. 설명이 막히는 곳은 다시 살펴볼 단서가 된다.', '중요한 문장을 많이 표시하는 것보다 문장 사이의 관계를 하나라도 설명해 보는 일이 도움이 될 수 있다.', '다시 읽을 때에는 처음과 똑같이 훑지 말고, 방금 설명하지 못했던 부분을 먼저 확인한다.'],
    ['오답에 이유를 남기기', '오답에는 정답만 적지 말고 그 선지를 골랐던 이유를 한 문장 남겨 보자. 당시의 판단을 알아야 바꿀 지점도 찾을 수 있다.', '조건을 놓쳤는지, 개념을 혼동했는지, 계산 과정이 틀렸는지 구분한다. 같은 오답이라도 다음 행동은 달라질 수 있다.', '복습할 때에는 해설을 가리고 다시 판단한다. 이유를 설명할 수 있게 되면 기록에 해결한 날짜를 남긴다.'],
    ['시간을 기록하고 조정하기', '시험 모드에서는 풀이에 걸린 시간을 확인할 수 있다. 기록을 볼 때에는 총시간과 오래 머문 문항을 함께 살펴보자.', '오래 걸린 이유를 생각해 본다. 내용을 다시 읽었는지, 계산을 반복했는지, 두 선지 사이에서 망설였는지 구체적으로 적는다.', '다음 연습에서는 바꿀 행동을 하나만 정한다. 한 번의 결과로 자신을 단정하지 말고 여러 번의 변화를 비교한다.'],
    ['질문을 구체적으로 만들기', '해설을 읽고도 막힌 부분이 있다면 어느 문장과 어느 판단 사이에서 이해가 끊겼는지 찾아보자.', 'TA에게 질문할 때에는 문항 번호, 사용한 조건, 자신이 생각한 풀이를 함께 적는다. 질문의 출발점이 선명해진다.', '답변을 받은 뒤에는 설명을 그대로 옮기기보다 자신의 말로 다시 정리한다. 같은 조건을 만나면 무엇을 확인할지도 적어 둔다.'],
    ['복습을 다시 만나는 시간', '복습할 문항이 많다면 오늘 확인할 몇 개를 먼저 고른다. 시작할 수 있는 분량을 정하면 밀린 기록을 펼치기 쉬워진다.', '플래시카드의 답을 보기 전에 잠깐 멈춰 생각해 보자. 정답뿐 아니라 그 근거를 떠올리는 것이 목표이다.', '아직 헷갈리는 문항은 다시 복습할 목록에 남기고, 설명할 수 있는 문항은 완료로 표시한다. 목록은 다음 학습을 위한 안내가 된다.'],
    ['한 주의 학습을 돌아보기', '한 주가 끝나면 많이 한 일과 잘 이해한 일을 구분해서 적어 보자. 분량과 이해는 서로 다른 점검 기준이다.', '예상과 달랐던 부분에는 이유를 붙인다. 계획이 과했는지, 필요한 개념이 부족했는지 살펴보면 다음 주의 우선순위가 보인다.', '유지할 행동 하나와 바꿀 행동 하나를 정한다. 작은 조정을 기록하며 자신에게 맞는 학습 방법을 만들어 간다.']
  ];
  function getPage(bookId, page) {
    const book = getBook(bookId);
    const n = Number(page);
    if (!book || !Number.isInteger(n) || n < 1 || n > book.pages) return null;
    if (book.kind === 'workbook') {
      const question = getQuestion(bookId, n);
      return { kind: 'question', title: book.title + ' ' + book.issue + '회', kicker: book.subject + ' · 예시 문항', paragraphs: [question.passage], question: question, isDemo: true };
    }
    if (n === 1) return {
      kind: 'cover', title: book.title, kicker: 'VOL. ' + book.issue + ' · ' + book.subtitle,
      paragraphs: ['나의 학습을 기록하고 다음 방향을 찾는 시간.', '작은 점검과 꾸준한 복습으로 오늘의 공부를 이어 갑니다.', '이 본문은 화면과 읽기 기능 확인을 위해 직접 작성한 예시입니다.'],
      quote: '오늘의 기록이 다음 학습의 출발점이 됩니다.', isDemo: true
    };
    if (n === 2) return {
      kind: 'contents', title: '이 페이지에서 시작해요', kicker: book.subtitle,
      paragraphs: ['03–06 · 목표를 나누고 읽기의 빈틈을 확인하기', '07–10 · 오답의 이유와 풀이 시간을 기록하기', '11–15 · 질문을 정리하고 다음 복습을 계획하기'], isDemo: true
    };
    const article = articles[(n - 3) % articles.length];
    return {
      kind: 'article', title: article[0], kicker: book.subtitle + ' · 학습 기록 ' + String(n - 2).padStart(2, '0'),
      paragraphs: article.slice(1), quote: '정답을 확인한 뒤, 나의 판단을 한 번 더 돌아봅니다.', isDemo: true
    };
  }

  const api = { subjects: subjects, books: books, demoNotice: demoNotice, getBook: getBook, getQuestions: getQuestions, getQuestion: getQuestion, allQuestions: allQuestions, getPage: getPage };
  root.EbookData = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
