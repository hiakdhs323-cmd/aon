const reference = [
  {
    title: "문단과 제목",
    examples: [
      ["== 제목 ==", "문단 제목"],
      ["=== 제목 ===", "하위 문단 제목"],
      ["==== 제목 ====", "세부 문단 제목"],
      ["----", "가로 구분선"],
      ["[br]", "줄바꿈"],
      ["[clearfix]", "좌우 정렬 요소 아래로 흐름 정리"],
    ],
  },
  {
    title: "글자 꾸미기",
    examples: [
      ["'''굵게'''", <strong>굵은 글씨</strong>],
      ["''기울임''", <em>기울임</em>],
      ["__밑줄__", <u>밑줄</u>],
      ["~~취소선~~", <s>취소선</s>],
      ["^^위첨자^^", "위첨자"],
      [",,아래첨자,,", "아래첨자"],
      ["{{{+1 큰 글씨}}}", "글자 크기 조절"],
      ["{{{#red 빨간 글씨}}}", "글자 색상 지정"],
    ],
  },
  {
    title: "링크와 각주",
    examples: [
      ["[[문서명]]", "위키 문서 링크"],
      ["[[문서명|표시할 글자]]", "링크에 표시할 문구 지정"],
      ["[[문서명#s-1]]", "문서의 특정 문단으로 이동"],
      ["[https://example.com 링크]", "외부 링크"],
      ["[* 각주 내용]", "각주 추가"],
      ["[anchor(이름)]", "문서 내 이동 지점 생성"],
      ["[[분류:분류명]]", "문서를 분류에 등록"],
    ],
  },
  {
    title: "목록과 표",
    examples: [
      ["* 항목", "글머리 목록"],
      ["1. 항목", "번호 목록"],
      ["|| 항목 || 항목 ||", "표의 한 행"],
      ["||<tablewidth=500> 내용 ||", "표 너비 지정 예시"],
      ["||<:> 가운데 ||", "셀 내용 가운데 정렬"],
      ["||<-2> 내용 ||", "셀을 가로로 합치기"],
    ],
  },
  {
    title: "이미지와 특수 기능",
    examples: [
      ["[[파일:이름.png]]", "이미지 삽입"],
      ["[[파일:이름.png|width=300]]", "이미지 너비 지정"],
      ["[[파일:이름.png|align=right]]", "이미지 오른쪽 정렬"],
      ["[목차]", "문서 목차 표시"],
      ["[목차(hide)]", "접힌 목차 표시"],
      ["[date]</code> · <code>[datetime]", "날짜 또는 날짜와 시간"],
      ["[ruby(漢字,ruby=かんじ)]", "루비 문자 표시"],
    ],
  },
  {
    title: "고급 문법",
    codeHeading: "입력 시작",
    examples: [
      ["{{{#!folding 제목", "접을 수 있는 영역"],
      ['{{{#!wiki style="..."', "스타일 영역"],
      ["{{{#!latex", "LaTeX 수식 영역"],
      ["{{{#!syntax python", "코드 구문 강조"],
      ['{{{#!if docName == "문서명"', "문서 조건에 따른 내용 표시"],
    ],
  },
];

export default function EditorHelp() {
  return (
    <div id="editor-help" className="editor-help" hidden>
      <h2>나무마크 문법 도움말</h2>
      <p className="syntax-intro">
        자주 사용하는 문법을 종류별로 정리했습니다. 입력 예시를 그대로 복사해
        사용할 수 있으며, 저장 전에 미리보기로 결과를 확인하세요.
      </p>
      {reference.map(({ title, codeHeading = "입력", examples }) => (
        <section key={title}>
          <h3>{title}</h3>
          <table className="syntax-reference">
            <thead>
              <tr>
                <th>{codeHeading}</th>
                <th>설명</th>
              </tr>
            </thead>
            <tbody>
              {examples.map(([source, description]) => (
                <tr key={source}>
                  <td>
                    <code>{source}</code>
                  </td>
                  <td>{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <p id="editor-linkcolor-help" hidden>
        관리자 전용 문서별 링크 색상 설정입니다.
      </p>
      <pre id="editor-linkcolor-example" hidden>
        <code>
          {
            "{{{#!linkcolor\nlight: #0969da\ndark: #79c0ff\nvisited-light: #8250df\nvisited-dark: #c297ff\nhover-light: #0550ae\nhover-dark: #a5d6ff\n}}}"
          }
        </code>
      </pre>
      <p className="syntax-note">
        문법은 문서 편집기에서 미리보기로 확인할 수 있습니다. 일부 고급 문법은
        위키 엔진의 지원 범위에 따라 동작이 달라질 수 있습니다.
      </p>
    </div>
  );
}
