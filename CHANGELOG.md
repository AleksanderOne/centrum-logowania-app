# [2.2.0](https://github.com/AleksanderOne/centrum-logowania-app/compare/v2.1.0...v2.2.0) (2025-12-27)


### Features

* **auth:** dodaj stronę błędów z formularzem kontaktowym ([ecf4aaa](https://github.com/AleksanderOne/centrum-logowania-app/commit/ecf4aaa18913dc3b0cb46ce15635a11b0b5d9f91))
* **auth:** dodanie pełnej obsługi wylogowania z projektu ([8813bf8](https://github.com/AleksanderOne/centrum-logowania-app/commit/8813bf850afc03d0082a1718219646cd9a34f97c))
* **security:** implementacja izolacji danych, rate limiting, audit logów i ulepszenia SDK ([2a705fb](https://github.com/AleksanderOne/centrum-logowania-app/commit/2a705fbfa7db33dc6df8e3244b5934291c00b643))
* **security:** implementacja izolacji danych, rate limiting, audit logów i ulepszenia SDK ([9cf7ab3](https://github.com/AleksanderOne/centrum-logowania-app/commit/9cf7ab3c23b0e1759d526ba2a5529a964acbcde4))

# [2.1.0](https://github.com/AleksanderOne/centrum-logowania-app/compare/v2.0.0...v2.1.0) (2025-12-26)


### Features

* dodanie testera integracji, monitora sesji i ulepszeń UI ([21582ec](https://github.com/AleksanderOne/centrum-logowania-app/commit/21582ecc517a11a59745500dc0dc38005eb65c5b))

# [2.0.0](https://github.com/AleksanderOne/centrum-logowania-app/compare/v1.1.0...v2.0.0) (2025-12-26)


### Features

* **testing:** dodanie mutation testing i 100% coverage ([c8bdabb](https://github.com/AleksanderOne/centrum-logowania-app/commit/c8bdabb5127bb44cf60f172d1358635a3dc97a59))


### BREAKING CHANGES

* **testing:** Wymagane 100% pokrycia testami dla każdego nowego pliku

# [1.1.0](https://github.com/AleksanderOne/centrum-logowania-app/compare/v1.0.0...v1.1.0) (2025-12-26)


### Features

* dodano dynamiczny status systemu z health-check API ([21677da](https://github.com/AleksanderOne/centrum-logowania-app/commit/21677da7eac250cea51dd372843e02d5b1b2bf76))

# 1.0.0 (2025-12-26)


### Bug Fixes

* dodano AUTH_SECRET dla testów E2E w Playwright ([752801d](https://github.com/AleksanderOne/centrum-logowania-app/commit/752801deaad3a694bf1da009a3ca90fd34d1b1db))
* dodano AUTH_SECRET do GitHub Action dla buildu ([fbf7bc2](https://github.com/AleksanderOne/centrum-logowania-app/commit/fbf7bc2a2e43f16ddf84bc90723702db5d00288d))
* dodano instalację Playwright i wyłączono husky dla semantic-release ([e886da2](https://github.com/AleksanderOne/centrum-logowania-app/commit/e886da21be485deb08f37e754bc0560876854186))
* dodano NEXTAUTH_SECRET do zmiennych środowiskowych CI ([54c8e1a](https://github.com/AleksanderOne/centrum-logowania-app/commit/54c8e1a258da1a949900dca761dc9084514280c7))
* usunięcie middleware.ts - konflikt z proxy.ts w Next.js 16 ([ca6d2f5](https://github.com/AleksanderOne/centrum-logowania-app/commit/ca6d2f5444a26339ad01aed9b262a71e768ae204))


### Features

* **api:** Implementacja Kill Switch dla zarządzania sesjami SSO ([415e545](https://github.com/AleksanderOne/centrum-logowania-app/commit/415e545987ccfd762d9bcd4ce15d99361a1efed7))
* automatyczne wersjonowanie i ulepszenia UI ([8b6e83d](https://github.com/AleksanderOne/centrum-logowania-app/commit/8b6e83d2d37334266a60489b23fd1ecf5f3e4a77))
* Dodano szablony integracji SSO dla zewnętrznych aplikacji ([b2d60e8](https://github.com/AleksanderOne/centrum-logowania-app/commit/b2d60e8f44b8f079880c6774e85c5d3ad36910b9))
* konfiguracja shadcn/ui i podstawowych komponentów ([93af23c](https://github.com/AleksanderOne/centrum-logowania-app/commit/93af23c67b07f7df4d7497f21c710c7ffdf39e97))
* **oauth2:** Implementacja standardowego Authorization Code Flow ([d7ad834](https://github.com/AleksanderOne/centrum-logowania-app/commit/d7ad8345443ebb490b416f0d4a7a39eac8e317cd))
