## [2.7.1](https://github.com/AleksanderOne/centrum-logowania-app/compare/v2.7.0...v2.7.1) (2025-12-29)


### Bug Fixes

* **e2e:** napraw testy E2E - dodaj helper insertAuthCode ([0385258](https://github.com/AleksanderOne/centrum-logowania-app/commit/0385258e025b71b06a2e408c87899796adc93183))

# [2.7.0](https://github.com/AleksanderOne/centrum-logowania-app/compare/v2.6.0...v2.7.0) (2025-12-29)


### Bug Fixes

* **testy:** poprawa mockowania zmiennych środowiskowych w audytach ([4c628b9](https://github.com/AleksanderOne/centrum-logowania-app/commit/4c628b9bce03fe7770b56b076631724edd2c573b))


### Features

* **api:** endpointy administracyjne i rotacja kluczy API ([6c0e6b8](https://github.com/AleksanderOne/centrum-logowania-app/commit/6c0e6b85b62d8a794da644a7170a590616352eab))
* **auth:** aktualizacja logiki autentykacji i walidacji ([c97d531](https://github.com/AleksanderOne/centrum-logowania-app/commit/c97d5310b2cfe503bc008e070cced6a1c48d99f3))
* **db:** dodanie obsługi PKCE oraz czasu ostatniej aktywności sesji ([98cd05e](https://github.com/AleksanderOne/centrum-logowania-app/commit/98cd05e603b842665eb94471a5cc5936afc3b8c6))
* **security:** wdrożenie kluczowych modułów bezpieczeństwa ([b6e162d](https://github.com/AleksanderOne/centrum-logowania-app/commit/b6e162d2bbfb4e5eec99e8a8026af62224d691d7))

# [2.6.0](https://github.com/AleksanderOne/centrum-logowania-app/compare/v2.5.1...v2.6.0) (2025-12-28)


### Features

* **security:** dodaj moduł CSRF protection z weryfikacją Origin/Referer ([e9ddfd9](https://github.com/AleksanderOne/centrum-logowania-app/commit/e9ddfd9be3a9cc78b7ff6ecf615765f0e0854afc))
* **security:** dodaj walidację Redirect URI z pełną weryfikacją bezpieczeństwa ([8314784](https://github.com/AleksanderOne/centrum-logowania-app/commit/8314784f21ef3ec94d6997a5835310ff63ad161c))
* **security:** dodaj wykrywanie ataków brute force z automatycznym blokowaniem ([e84c707](https://github.com/AleksanderOne/centrum-logowania-app/commit/e84c70764519fe28f2d5da3d863a8ae47223ea9d))
* **security:** eksportuj nowe moduły bezpieczeństwa w index.ts ([02ee139](https://github.com/AleksanderOne/centrum-logowania-app/commit/02ee13952b56d7486865b3d1e17886e39eb45aac))
* **security:** implementuj PKCE (Proof Key for Code Exchange) dla OAuth 2.0 ([4eb7aa0](https://github.com/AleksanderOne/centrum-logowania-app/commit/4eb7aa0f626e1d1804b9fc735264eae1a01d1929))

## [2.5.1](https://github.com/AleksanderOne/centrum-logowania-app/compare/v2.5.0...v2.5.1) (2025-12-28)


### Bug Fixes

* poprawa audit logów - obsługa usunięcia projektu ([409f303](https://github.com/AleksanderOne/centrum-logowania-app/commit/409f303848d0d178a19c064e917cdc5b82d96d29))

# [2.5.0](https://github.com/AleksanderOne/centrum-logowania-app/compare/v2.4.0...v2.5.0) (2025-12-28)

### Features

- zdejmuje blokade dla - "user_not_registered" ([48b4eae](https://github.com/AleksanderOne/centrum-logowania-app/commit/48b4eae6d2347c0576199fecbf94f234f038839a))

# [2.4.0](https://github.com/AleksanderOne/centrum-logowania-app/compare/v2.3.1...v2.4.0) (2025-12-28)

### Features

- implementacja setup code (backend + ui) ([dcef497](https://github.com/AleksanderOne/centrum-logowania-app/commit/dcef4970c8a6e80d432623adf7f9441ffff88942))
- infrastruktura logowania i debugowania ([6969703](https://github.com/AleksanderOne/centrum-logowania-app/commit/69697031e88529e09a785c5d0e771831eafaee7d))
- logika biznesowa dashboardu i API ([48d298c](https://github.com/AleksanderOne/centrum-logowania-app/commit/48d298ce0d026ff60969dbb07274451ceebf45b9))
- redesign strony logowania i ulepszenia UI ([8b6dc36](https://github.com/AleksanderOne/centrum-logowania-app/commit/8b6dc36d16a8d6356122fcf81e40af45cd640233))

## [2.3.1](https://github.com/AleksanderOne/centrum-logowania-app/compare/v2.3.0...v2.3.1) (2025-12-27)

### Bug Fixes

- naprawa przekierowań callbackUrl i obsługa localhost w API ([a6239a8](https://github.com/AleksanderOne/centrum-logowania-app/commit/a6239a801bef73abd755f564fbbce286f8b0d5dd))

# [2.3.0](https://github.com/AleksanderOne/centrum-logowania-app/compare/v2.2.0...v2.3.0) (2025-12-27)

### Bug Fixes

- **audit:** dodaj pełne dane do logów wylogowania ([ca2b6f0](https://github.com/AleksanderOne/centrum-logowania-app/commit/ca2b6f029d15d913092edc7fc0b694e43c16266c))

### Features

- **audit:** dodaj kasowanie logów audytu ([24242af](https://github.com/AleksanderOne/centrum-logowania-app/commit/24242af78302d361158c7374cfd88cce058f750c))
- **auth:** obsługa callbackUrl przy logowaniu ([c9a1472](https://github.com/AleksanderOne/centrum-logowania-app/commit/c9a1472f34388d1e94183f0be1d03d6b7191f3bc))

# [2.2.0](https://github.com/AleksanderOne/centrum-logowania-app/compare/v2.1.0...v2.2.0) (2025-12-27)

### Features

- **auth:** dodaj stronę błędów z formularzem kontaktowym ([ecf4aaa](https://github.com/AleksanderOne/centrum-logowania-app/commit/ecf4aaa18913dc3b0cb46ce15635a11b0b5d9f91))
- **auth:** dodanie pełnej obsługi wylogowania z projektu ([8813bf8](https://github.com/AleksanderOne/centrum-logowania-app/commit/8813bf850afc03d0082a1718219646cd9a34f97c))
- **security:** implementacja izolacji danych, rate limiting, audit logów i ulepszenia SDK ([2a705fb](https://github.com/AleksanderOne/centrum-logowania-app/commit/2a705fbfa7db33dc6df8e3244b5934291c00b643))
- **security:** implementacja izolacji danych, rate limiting, audit logów i ulepszenia SDK ([9cf7ab3](https://github.com/AleksanderOne/centrum-logowania-app/commit/9cf7ab3c23b0e1759d526ba2a5529a964acbcde4))

# [2.1.0](https://github.com/AleksanderOne/centrum-logowania-app/compare/v2.0.0...v2.1.0) (2025-12-26)

### Features

- dodanie testera integracji, monitora sesji i ulepszeń UI ([21582ec](https://github.com/AleksanderOne/centrum-logowania-app/commit/21582ecc517a11a59745500dc0dc38005eb65c5b))

# [2.0.0](https://github.com/AleksanderOne/centrum-logowania-app/compare/v1.1.0...v2.0.0) (2025-12-26)

### Features

- **testing:** dodanie mutation testing i 100% coverage ([c8bdabb](https://github.com/AleksanderOne/centrum-logowania-app/commit/c8bdabb5127bb44cf60f172d1358635a3dc97a59))

### BREAKING CHANGES

- **testing:** Wymagane 100% pokrycia testami dla każdego nowego pliku

# [1.1.0](https://github.com/AleksanderOne/centrum-logowania-app/compare/v1.0.0...v1.1.0) (2025-12-26)

### Features

- dodano dynamiczny status systemu z health-check API ([21677da](https://github.com/AleksanderOne/centrum-logowania-app/commit/21677da7eac250cea51dd372843e02d5b1b2bf76))

# 1.0.0 (2025-12-26)

### Bug Fixes

- dodano AUTH_SECRET dla testów E2E w Playwright ([752801d](https://github.com/AleksanderOne/centrum-logowania-app/commit/752801deaad3a694bf1da009a3ca90fd34d1b1db))
- dodano AUTH_SECRET do GitHub Action dla buildu ([fbf7bc2](https://github.com/AleksanderOne/centrum-logowania-app/commit/fbf7bc2a2e43f16ddf84bc90723702db5d00288d))
- dodano instalację Playwright i wyłączono husky dla semantic-release ([e886da2](https://github.com/AleksanderOne/centrum-logowania-app/commit/e886da21be485deb08f37e754bc0560876854186))
- dodano NEXTAUTH_SECRET do zmiennych środowiskowych CI ([54c8e1a](https://github.com/AleksanderOne/centrum-logowania-app/commit/54c8e1a258da1a949900dca761dc9084514280c7))
- usunięcie middleware.ts - konflikt z proxy.ts w Next.js 16 ([ca6d2f5](https://github.com/AleksanderOne/centrum-logowania-app/commit/ca6d2f5444a26339ad01aed9b262a71e768ae204))

### Features

- **api:** Implementacja Kill Switch dla zarządzania sesjami SSO ([415e545](https://github.com/AleksanderOne/centrum-logowania-app/commit/415e545987ccfd762d9bcd4ce15d99361a1efed7))
- automatyczne wersjonowanie i ulepszenia UI ([8b6e83d](https://github.com/AleksanderOne/centrum-logowania-app/commit/8b6e83d2d37334266a60489b23fd1ecf5f3e4a77))
- Dodano szablony integracji SSO dla zewnętrznych aplikacji ([b2d60e8](https://github.com/AleksanderOne/centrum-logowania-app/commit/b2d60e8f44b8f079880c6774e85c5d3ad36910b9))
- konfiguracja shadcn/ui i podstawowych komponentów ([93af23c](https://github.com/AleksanderOne/centrum-logowania-app/commit/93af23c67b07f7df4d7497f21c710c7ffdf39e97))
- **oauth2:** Implementacja standardowego Authorization Code Flow ([d7ad834](https://github.com/AleksanderOne/centrum-logowania-app/commit/d7ad8345443ebb490b416f0d4a7a39eac8e317cd))
