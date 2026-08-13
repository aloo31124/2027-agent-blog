# 內容與編輯體驗需求品質檢核表：有後台可編輯、可快速部屬的部落格網站

**Purpose**: 檢驗「文章狀態、標籤、圖片、預覽、衝突處理」相關**需求本身**是否完整、明確、一致且可驗證
**Created**: 2026-08-13
**Feature**: [spec.md](../spec.md)
**Depth**: 標準審查 | **Audience**: 進入 `/speckit-tasks` 前的規格把關

> 本清單檢驗的是**需求寫得好不好**，不是編輯器好不好用。

## 需求完整性 Requirement Completeness

- [x] CHK001 是否定義了網址代稱變更後，舊網址的處理方式（失效或轉向）？[Gap, Spec §FR-014]
- [x] CHK002 是否定義了文章下架後，既有外部連結造訪時應看到什麼？[Gap, Spec §FR-012]
- [ ] CHK003 是否定義了 Markdown 的支援範圍（表格、程式碼區塊、內嵌 HTML 是否允許）？[Gap, Spec §FR-009]
- [ ] CHK004 是否定義了標籤的重新命名與刪除行為，以及對既有文章的影響？[Gap, Spec §FR-017]
- [ ] CHK005 是否定義了未被任何文章引用的圖片該如何處理？[Gap, Spec §FR-019]
- [ ] CHK006 是否定義了草稿的自動暫存需求，而非僅有離開前提醒？[Gap, Spec §FR-023]
- [ ] CHK007 是否定義了各欄位的長度上限（標題、摘要、內文）？[Gap, Spec §FR-024]
- [ ] CHK008 是否定義了「待審核」狀態的內容可被哪些角色檢視？[Gap, Spec §FR-010]
- [ ] CHK009 Edge Cases 提到的「站上尚無任何文章」空狀態，是否有對應的功能需求編號？[Traceability, Spec §Edge Cases]

## 需求明確性 Requirement Clarity

- [X] CHK010 FR-021 的圖片替代文字是「可以填」還是「必須填」？語意是否明確？[Ambiguity, Spec §FR-021]
- [ ] CHK011 FR-009 列出的欄位中，哪些為必填、哪些選填，是否逐一界定？[Clarity, Spec §FR-009]
- [ ] CHK012 FR-015 的建立與更新時間是否定義了呈現方式與時區依據？[Clarity, Spec §FR-015, §Assumptions]
- [X] CHK013 FR-020 的「常見網頁圖片格式」是否明確列舉，而非留待實作認定？[Ambiguity, Spec §FR-020]
- [ ] CHK014 FR-016 偵測到衝突後，使用者可採取哪些動作（保留哪一版）是否有定義？[Completeness, Spec §FR-016]
- [ ] CHK015 FR-022 的「即時預覽」是否定義預覽結果須與正式頁面樣式一致？[Gap, Spec §FR-022]

## 需求一致性 Requirement Consistency

- [ ] CHK016 三種狀態（草稿／待審核／已發佈）的定義在 FR-010、FR-011、FR-012 與 US5 之間是否用詞一致？[Consistency, Spec §FR-010～§FR-012]
- [ ] CHK017 FR-011（草稿不得出現在任何位置）與 FR-018（標籤頁）之間，草稿的標籤是否會使空標籤頁被建立，兩者是否已對齊？[Consistency, Spec §FR-011, §FR-018]
- [ ] CHK018 FR-013（刪除需確認）與 FR-012（下架）是否清楚區分為兩種不同操作？[Clarity, Spec §FR-012, §FR-013]

## 邊界與例外情境 Edge Case & Exception Coverage

- [ ] CHK019 是否定義了兩篇文章日期相同時的排序規則？[Gap, Edge Case, Spec §FR-025]
- [ ] CHK020 是否定義了文章內容極長或極短時的呈現要求（列表頁摘要截斷規則）？[Gap, Edge Case]
- [ ] CHK021 是否定義了標籤數量過多時的呈現要求？[Gap, Edge Case]
- [ ] CHK022 是否定義了圖片上傳中斷或重複檔名時的行為？[Gap, Edge Case, Spec §FR-019]

## 驗收標準品質 Acceptance Criteria Quality

- [ ] CHK023 FR-022 的「1 秒內反映」是否定義量測起點（最後一次輸入或停止輸入）？[Measurability, Spec §FR-022]
- [ ] CHK024 SC-008（90% 首次使用者不需文件即可完成發文）是否定義受測族群與判定方式？[Measurability, Spec §SC-008]

## 已決議項目（記錄用，不需再議）

> 依使用者決定，以下缺口已知情並接受。詳見 [plan.md](../plan.md) 的 Complexity Tracking。

- [x] CHK025 網址代稱唯一性於建置期強制，非儲存前即時查重 — **已決議接受** [Spec §FR-014]

## Notes

- CHK001 與 CHK002 建議優先處理：兩者都會直接造成讀者踩到死連結，而規格目前沒有任何敘述。
- CHK010 與 [ux.md](./ux.md) 的無障礙項目相關聯，建議一起裁決。
- 標示 `[Gap]` 者代表**規格目前沒寫**，需判斷是補進 spec 還是明確列入 Out of Scope。
