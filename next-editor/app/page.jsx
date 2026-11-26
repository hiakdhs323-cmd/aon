import EditorHelp from "./editor-help";

export default function EditorPage() {
  return (
    <section id="editor-view" className="editor-view" hidden>
      <section className="editor-card">
        <form id="editor-form" noValidate>
          <div className="editor-page-heading">
            <div className="editor-title-line">
              <h1 id="editor-heading" className="editor-mode-label">
                문서 편집
              </h1>
              <span
                id="editor-breadcrumb"
                className="editor-breadcrumb-state"
                aria-hidden="true"
              ></span>
            </div>
            <div className="editor-heading-actions">
              <div className="editor-context-actions" aria-label="문서 작업">
                <button
                  id="editor-backlinks-action"
                  className="button"
                  type="button"
                >
                  역링크
                </button>
                <button
                  id="editor-move-action"
                  className="button"
                  type="button"
                >
                  이동
                </button>
                <button
                  id="editor-delete-action"
                  className="button editor-delete-action"
                  type="button"
                >
                  삭제
                </button>
              </div>
              <button
                id="editor-help-toggle"
                className="button"
                type="button"
                aria-expanded="false"
              >
                문법 도움말
              </button>
              <a
                className="button editor-guide-link"
                href="#/w/AonWiki%3A%EB%AC%B8%EB%B2%95"
                target="_blank"
                rel="noopener noreferrer"
              >
                문법
              </a>
              <button id="editor-cancel" className="button" type="button">
                취소
              </button>
            </div>
          </div>
          <fieldset id="editor-fields" className="editor-fields">
            <div className="editor-field editor-title-field" hidden>
              <div id="editor-title-wrap" className="editor-title-inline">
                <label htmlFor="editor-title">문서 제목</label>
                <input
                  id="editor-title"
                  maxLength={120}
                  placeholder="문서 제목을 입력하세요."
                  autoComplete="off"
                />
              </div>
              <p id="editor-title-help" className="editor-field-help" hidden>
                제목을 바꾸면 기존 제목으로 접속해도 새 문서로 연결됩니다.
              </p>
            </div>
            <div className="editor-field editor-main-field">
              <div className="editor-toolbar-line">
                <div
                  className="editor-tabs"
                  role="tablist"
                  aria-label="편집 화면"
                >
                  <button
                    id="editor-tab-write"
                    className="active"
                    type="button"
                    role="tab"
                    aria-selected="true"
                    aria-controls="editor-code-pane"
                  >
                    편집기
                  </button>
                  <button
                    id="editor-tab-raw"
                    type="button"
                    role="tab"
                    aria-selected="false"
                    aria-controls="editor-code-pane"
                  >
                    RAW 편집
                  </button>
                  <button
                    id="editor-tab-preview"
                    type="button"
                    role="tab"
                    aria-selected="false"
                    aria-controls="editor-preview-pane"
                  >
                    미리보기
                  </button>
                </div>
                <div
                  className="editor-markup-toolbar"
                  role="toolbar"
                  aria-label="나무마크 빠른 삽입"
                >
                  <button type="button" data-markup="bold" title="굵게">
                    <strong>굵게</strong>
                  </button>
                  <button type="button" data-markup="italic" title="기울임">
                    <em>기울임</em>
                  </button>
                  <button type="button" data-markup="strike" title="취소선">
                    <s>취소선</s>
                  </button>
                  <button type="button" data-markup="link" title="문서 링크">
                    링크
                  </button>
                  <button id="editor-image" type="button" title="파일 업로드">
                    파일
                  </button>
                  <button type="button" data-markup="footnote" title="각주">
                    각주
                  </button>
                  <button type="button" data-markup="template" title="틀 삽입">
                    틀
                  </button>
                  <button
                    id="editor-autocorrect"
                    type="button"
                    className="editor-autocorrect"
                    title="오타 수정 BOT"
                  >
                    오타
                  </button>
                </div>
              </div>
              <div
                id="editor-workspace"
                className="editor-workspace"
                data-mode="write"
              >
                <section
                  id="editor-code-pane"
                  className="editor-code-pane"
                  aria-label="나무마크 편집"
                >
                  <div id="editor-code-wrap" className="editor-code-wrap">
                    <pre
                      id="editor-line-numbers"
                      className="editor-line-numbers"
                      aria-hidden="true"
                    >
                      1
                    </pre>
                    <pre
                      id="editor-highlight"
                      className="editor-highlight"
                      aria-hidden="true"
                    >
                      <code id="editor-highlight-code"></code>
                    </pre>
                    <textarea
                      id="editor-content"
                      spellCheck={false}
                      placeholder="문서 내용을 나무마크 문법으로 입력하세요."
                      aria-label="문서 원문"
                    />
                  </div>
                </section>
                <section
                  id="editor-preview-pane"
                  className="editor-preview-pane"
                  aria-label="문서 미리보기"
                  hidden
                >
                  <div className="editor-preview-head">
                    <strong>미리보기</strong>
                    <div className="editor-preview-controls">
                      <span
                        id="editor-preview-status"
                        role="status"
                        aria-live="polite"
                      >
                        미리보기를 열면 서버에서 렌더링합니다.
                      </span>
                      <button
                        id="editor-preview-refresh"
                        type="button"
                        title="미리보기 새로고침"
                      >
                        새로고침
                      </button>
                    </div>
                  </div>
                  <div className="editor-preview-page">
                    <div className="breadcrumbs editor-preview-breadcrumbs">
                      <span>AonWiki</span>
                      <span>›</span>
                      <span id="editor-preview-crumb"></span>
                    </div>
                    <section className="article editor-preview-document">
                      <div className="article-titlebar">
                        <h1 id="editor-preview-title"></h1>
                        <div className="title-actions">
                          <span className="optional-label">미리보기</span>
                        </div>
                      </div>
                      <div className="article-tools">
                        <span className="current-tab">
                          <span
                            className="article-tab-icon"
                            data-entry-icon="document"
                            aria-hidden="true"
                          ></span>
                          <span>문서</span>
                        </span>
                        <span className="tool-spacer"></span>
                        <span className="article-language">한국어</span>
                      </div>
                      <article
                        id="editor-preview"
                        className="namumark-content-host editor-preview"
                        hidden
                      ></article>
                      <footer className="article-footer">
                        <span>AonWiki</span>
                        <span>저장 전 문서 렌더링 미리보기입니다.</span>
                      </footer>
                    </section>
                  </div>
                </section>
              </div>
              <div className="editor-counterbar">
                <span
                  id="editor-draft-indicator"
                  className="editor-draft-indicator"
                  aria-live="polite"
                >
                  브라우저 초안 자동 저장
                </span>
                <span id="editor-counter" className="editor-counter">
                  0 / 200,000자
                </span>
              </div>
            </div>
            <div className="editor-field editor-summary-field">
              <label htmlFor="editor-summary">편집 요약</label>
              <input
                id="editor-summary"
                maxLength={200}
                placeholder="어떤 내용을 수정했나요? (선택)"
              />
            </div>
          </fieldset>
          <div className="editor-terms-block">
            <label className="editor-public-ack">
              <input id="editor-public-ack" type="checkbox" required />
              <span>
                <strong>CC0 기여 조건에 동의해요</strong>
                문서 편집을 저장하면 기여한 내용을 CC0으로 배포하고, 기여한
                문서에 대한 하이퍼링크나 URL을 이용한 저작자 표시로 충분하다는
                데 동의하는 것입니다. 이 동의는 철회할 수 없습니다.
              </span>
            </label>
            <p id="editor-ip-warning" className="editor-ip-warning" hidden></p>
            <p id="editor-login-note" className="editor-login-note" hidden></p>
          </div>
          <EditorHelp />
          <p id="editor-status" className="editor-status" role="status"></p>
          <div className="editor-actions">
            <p id="editor-save-note">
              CC0 기여 조건에 동의하면 저장할 수 있어요.
            </p>
            <button
              id="editor-save"
              className="button button-primary"
              type="submit"
              disabled
              aria-describedby="editor-save-note"
            >
              저장
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
