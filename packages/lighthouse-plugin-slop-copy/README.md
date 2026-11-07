# `lighthouse-plugin-slop-copy`

Lighthouse plugin (`R-14` / [#330](https://github.com/ravidsrk/slop-detect/issues/330)) exposing Slop Detector's **Copy axis**, **paste/chatbot artifact detectors** (`C-02`, `C-03`, `C-05`, `C-06`), and **HTML-level AEO eligibility checks** to Lighthouse and Lighthouse CI (`@lhci/cli`).

> **Scope constraint:** Lighthouse plugins only receive built-in gatherer artifacts (`MainDocumentContent`, `MetaElements`, `LinkElements`) and cannot gather computed DOM styles. This plugin covers **Copy + HTML-level AEO only**; use `npx slop-detect <url>` for the computed-style Design and `DESIGN.md` axes.
