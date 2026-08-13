# 發佈與部署需求品質檢核表：有後台可編輯、可快速部屬的部落格網站

**Purpose**: 檢驗「自動發佈、部署前閘門、失敗回復、發佈狀態回報」相關**需求本身**是否完整、明確、可量測
**Created**: 2026-08-13
**Feature**: [spec.md](../spec.md)
**Depth**: 標準審查 | **Audience**: 進入 `/speckit-tasks` 前的規格把關

> 本清單檢驗的是**需求寫得好不好**，不是部署跑不跑得起來。

## 需求完整性 Requirement Completeness

- [ ] CHK001 是否定義了短時間內連續發佈多次時的排隊、合併或取消行為？[Gap]
- [ ] CHK002 是否定義了建置流程卡住或逾時的處理要求？[Gap, Exception Flow]
- [ ] CHK003 是否定義了回滾需求——失敗後如何回到已知良好版本，以及由誰觸發？[Gap, Recovery Flow]
- [ ] CHK004 是否定義了發佈失敗時是否需主動通知操作者（而非等他回到後台才看見）？[Gap, Spec §FR-030]
- [ ] CHK005 是否定義了外部登入服務失效時，對發佈流程與讀者端的影響範圍？[Gap]
- [ ] CHK006 FR-032 的「關鍵頁面」是否在需求層完整列舉，而非留待實作決定？[Completeness, Spec §FR-032]
- [ ] CHK007 是否定義了公開網址的穩定性要求（網址一經發佈是否保證不變）？[Gap]
- [ ] CHK008 是否定義了建置產物的可重現性要求（同一份內容應產生一致的輸出）？[Gap]

## 需求明確性 Requirement Clarity

- [ ] CHK009 FR-031 的「可理解的失敗原因」是否定義了可查核的判準（需包含哪些資訊）？[Ambiguity, Spec §FR-031]
- [ ] CHK010 FR-030 的「最近一次發佈」是否界定判定範圍（哪個分支、是否含失敗與取消的紀錄）？[Clarity, Spec §FR-030]
- [ ] CHK011 SC-006 的「維持前一個成功版本可正常閱讀」是否定義保留幾個版本、保留多久？[Clarity, Spec §SC-006]
- [ ] CHK012 FR-033 的「一份文件化的步驟」是否定義該文件須涵蓋的範圍與完成判準？[Clarity, Spec §FR-033]
- [ ] CHK013 FR-029 的「自動觸發」是否明確界定觸發點是儲存、送審核可、還是合併完成？[Ambiguity, Spec §FR-029]

## 需求一致性 Requirement Consistency

- [ ] CHK014 SC-001（從零到上線 ≤ 10 分鐘）是否與 FR-033 對設定步驟的描述一致，兩者的起算與結束點是否相同？[Consistency, Spec §SC-001, §FR-033]
- [ ] CHK015 FR-031（失敗時線上維持舊版）與 FR-032（驗證未過不得取代線上版本）是否為重複敘述，或各自涵蓋不同情境？[Consistency, Spec §FR-031, §FR-032]
- [ ] CHK016 US2 的驗收情境與 FR-029～FR-033 是否逐條對得上，沒有情境缺乏對應需求？[Traceability, Spec §US2]

## 驗收標準品質 Acceptance Criteria Quality

- [x] CHK017 SC-001 的 10 分鐘是否明確界定起算點，以及是否包含後台登入設定？[Ambiguity, Spec §SC-001]
- [ ] CHK018 SC-003（95% 的發佈 3 分鐘內反映）是否定義量測起點、母體範圍與統計期間？[Measurability, Spec §SC-003]
- [x] CHK019 SC-002（撰寫到公開可讀 ≤ 5 分鐘）在需要管理員核可的多作者情境下是否仍成立？[Conflict, Spec §SC-002, §FR-007]
- [ ] CHK020 SC-006（失敗時 100% 顯示原因）是否定義了「顯示」的位置與時效？[Measurability, Spec §SC-006]

## 邊界與例外情境 Edge Case & Exception Coverage

- [ ] CHK021 是否定義了多筆待審核內容同時核可時的處理順序與相互影響？[Gap, Edge Case]
- [ ] CHK022 是否定義了內容通過驗證但部署階段失敗（外部平台問題）時的需求？[Gap, Exception Flow]
- [ ] CHK023 是否定義了首次部署（站上尚無任何文章）時驗證閘門的行為？[Coverage, Spec §Edge Cases]

## 假設與相依 Dependencies & Assumptions

- [ ] CHK024 「沿用既有部署流程」這項假設是否在需求層被明確記錄為相依，而非隱含前提？[Assumption, Spec §Assumptions]
- [ ] CHK025 是否記錄了對外部託管平台可用性的相依，以及該平台中斷時的預期行為？[Dependency, Gap]

## Notes

- CHK017 與 CHK019 建議優先處理：兩者都可能讓成功標準在多作者情境下無法成立。
- 標示 `[Gap]` 者代表**規格目前沒寫**，需判斷是補進 spec 還是明確列入 Out of Scope。
