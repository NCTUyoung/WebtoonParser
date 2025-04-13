# 🔌 抽象站點適配層設計

## 概述

抽象站點適配層是一種設計模式，用於標準化不同網站的網頁抓取邏輯，提高代碼重用性，並簡化新網站的整合過程。它通過定義統一的接口和基礎實現，同時封裝站點特定的邏輯，實現了高度的可擴展性和可維護性。

該設計允許我們在保持核心抓取邏輯一致的同時，只需針對新站點實現特定的數據提取邏輯，從而大大減少重複代碼，並簡化測試和維護工作。

## 目標

- **增加代碼重用**: 共享通用的抓取流程和請求處理邏輯
- **簡化新站點整合**: 提供清晰的接口和擴展模式，使添加新站點變得容易
- **隔離站點特定邏輯**: 將特定於站點的選擇器和解析邏輯封裝在獨立的適配器中
- **提高可測試性**: 便於對抽象接口和具體實現進行單元測試
- **增強類型安全**: 利用 TypeScript 接口確保所有適配器實現一致的 API

## 目錄結構

```
src/
└── main/
    └── scraper/
        ├── adapters/                  # 站點適配器目錄
        │   ├── ISiteAdapter.ts        # 站點適配器接口
        │   ├── BaseAdapter.ts         # 基礎適配器實現
        │   ├── WebtoonAdapter.ts      # Webtoon 站點適配器
        │   ├── KadoKadoAdapter.ts     # KadoKado 站點適配器
        │   └── index.ts               # 導出所有適配器
        ├── factories/
        │   └── SiteAdapterFactory.ts  # 適配器工廠
        ├── models/                    # 數據模型
        │   ├── Content.ts             # 通用內容接口
        │   ├── Chapter.ts             # 章節接口
        │   └── SiteType.ts            # 站點類型枚舉
        └── utils/
            └── url-parser.ts          # URL 解析工具
```

## 核心組件

### 站點適配器接口 (ISiteAdapter)

```typescript
// scraper/interfaces/ISiteAdapter.ts
import { ContentInfo } from '../models/ContentInfo';
import { Chapter } from '../models/Chapter';
import { SiteType } from '../models/SiteType';
import { ContentType } from '../models/ContentType';

export interface ISiteAdapter {
  /**
   * 獲取處理的 URL
   */
  getUrl(): string;

  /**
   * 獲取站點類型
   */
  getSiteType(): SiteType;

  /**
   * 獲取內容類型 (漫畫或小說)
   */
  getContentType(): ContentType;

  /**
   * 獲取內容基本信息
   */
  getContentInfo(): Promise<ContentInfo>;

  /**
   * 獲取所有章節列表
   */
  getAllChapters(): Promise<Chapter[]>;

  /**
   * 將抓取的數據保存到 Excel 文件
   */
  saveToExcel(outputPath: string, appendToExisting: boolean): Promise<string>;
}
```

### 基礎適配器 (BaseAdapter)

基礎適配器實現共享邏輯，如請求處理、重試機制、Excel 文件生成等：

```typescript
// scraper/adapters/BaseAdapter.ts
import axios from 'axios';
import { ISiteAdapter } from '../interfaces/ISiteAdapter';
import { RequestThrottler } from '../utils/RequestThrottler';
import { ExcelManager } from '../../managers/ExcelManager';
import { getRandomUserAgent } from '../../core/config';
import { ContentInfo } from '../models/ContentInfo';
import { Chapter } from '../models/Chapter';

export abstract class BaseAdapter implements ISiteAdapter {
  protected url: string;
  protected userAgent: string;
  protected throttler: RequestThrottler;
  protected excelManager: ExcelManager;

  constructor(url: string) {
    this.url = url;
    this.userAgent = getRandomUserAgent();
    this.throttler = new RequestThrottler();
    this.excelManager = new ExcelManager();
  }

  getUrl(): string {
    return this.url;
  }

  /**
   * 使用節流控制發送請求
   */
  protected async getPage(url: string, retries = 3): Promise<string> {
    return this.throttler.throttleRequest(async () => {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': this.userAgent
          },
          responseType: 'arraybuffer'
        });

        const decoder = new TextDecoder('utf-8');
        return decoder.decode(response.data);
      } catch (error) {
        if (retries > 0) {
          // 實現指數退避延遲
          const delay = Math.pow(2, 4 - retries) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.getPage(url, retries - 1);
        }
        throw error;
      }
    });
  }

  abstract getSiteType(): SiteType;
  abstract getContentType(): ContentType;
  abstract getContentInfo(): Promise<ContentInfo>;
  abstract getAllChapters(): Promise<Chapter[]>;

  /**
   * 通用的 Excel 保存邏輯
   */
  async saveToExcel(outputPath: string, appendToExisting: boolean): Promise<string> {
    const info = await this.getContentInfo();
    const chapters = await this.getAllChapters();

    return this.excelManager.saveData({
      contentInfo: info,
      chapters: chapters,
      outputPath,
      appendToExisting,
      contentType: this.getContentType()
    });
  }
}
```

### 具體適配器實現 (以 Webtoon 為例)

```typescript
// scraper/adapters/WebtoonAdapter.ts
import * as cheerio from 'cheerio';
import { BaseAdapter } from './BaseAdapter';
import { SiteType } from '../models/SiteType';
import { ContentType } from '../models/ContentType';
import { ContentInfo } from '../models/ContentInfo';
import { Chapter } from '../models/Chapter';
import { selectors } from '../../core/config';

export class WebtoonAdapter extends BaseAdapter {
  private titleNo: string;

  constructor(url: string) {
    super(url);
    // 從 URL 中提取 titleNo
    const match = url.match(/\/([0-9]+)$/);
    this.titleNo = match ? match[1] : '';
    if (!this.titleNo) {
      throw new Error('無法從 URL 提取漫畫 ID');
    }
  }

  getSiteType(): SiteType {
    return SiteType.WEBTOON;
  }

  getContentType(): ContentType {
    return ContentType.COMIC;
  }

  async getContentInfo(): Promise<ContentInfo> {
    const url = `https://www.webtoons.com/zh-hant/romance/romance-101/list?title_no=${this.titleNo}`;
    const html = await this.getPage(url);
    const $ = cheerio.load(html);

    // 使用配置中的選擇器提取信息
    const selector = selectors.webtoon.info;

    const title = $(selector.title).text().trim();
    const author = $(selector.author).text().trim().substring(0, 50);
    const rating = $(selector.rating).text().trim();
    const genre = $(selector.genre).text().trim();

    return {
      title,
      author,
      rating: parseFloat(rating) || 0,
      genre,
      url: this.url,
      description: $(selector.description).text().trim(),
      additionalInfo: {
        // 可能的其他特定於 Webtoon 的信息
      }
    };
  }

  async getAllChapters(): Promise<Chapter[]> {
    // 獲取總頁數
    const totalPages = await this.getTotalPages();
    let allChapters: Chapter[] = [];

    // 遍歷所有頁面獲取章節信息
    for (let page = 1; page <= totalPages; page++) {
      const pageUrl = `https://www.webtoons.com/zh-hant/romance/romance-101/list?title_no=${this.titleNo}&page=${page}`;
      const html = await this.getPage(pageUrl);
      const chapters = this._parseChaptersFromHtml(html);
      allChapters = [...allChapters, ...chapters];
    }

    return allChapters;
  }

  private async getTotalPages(): Promise<number> {
    // 獲取分頁信息的邏輯
    const url = `https://www.webtoons.com/zh-hant/romance/romance-101/list?title_no=${this.titleNo}`;
    const html = await this.getPage(url);
    const $ = cheerio.load(html);

    // 尋找最後一個分頁鏈接
    const lastPageLink = $(selectors.webtoon.pagination.lastPage).attr('href');
    if (lastPageLink) {
      const match = lastPageLink.match(/page=(\d+)/);
      return match ? parseInt(match[1]) : 1;
    }
    return 1;
  }

  private _parseChaptersFromHtml(html: string): Chapter[] {
    const $ = cheerio.load(html);
    const chapters: Chapter[] = [];
    const selector = selectors.webtoon.chapters;

    $(selector.container).each((index, element) => {
      const chapterNo = $(element).find(selector.no).text().trim();
      const title = $(element).find(selector.title).text().trim();
      const date = $(element).find(selector.date).text().trim();
      const likes = $(element).find(selector.likes).text().trim();

      chapters.push({
        no: chapterNo,
        title,
        date,
        likes: parseInt(likes.replace(/,/g, '')) || 0
      });
    });

    return chapters;
  }
}
```

### KadoKado 適配器

```typescript
// scraper/adapters/KadoKadoAdapter.ts
import * as cheerio from 'cheerio';
import { BaseAdapter } from './BaseAdapter';
import { SiteType } from '../models/SiteType';
import { ContentType } from '../models/ContentType';
import { ContentInfo } from '../models/ContentInfo';
import { Chapter } from '../models/Chapter';
import { selectors } from '../../core/config';

export class KadoKadoAdapter extends BaseAdapter {
  private novelId: string;

  constructor(url: string) {
    super(url);
    // 從 URL 中提取小說 ID
    const match = url.match(/\/novels\/(\d+)/);
    this.novelId = match ? match[1] : '';
    if (!this.novelId) {
      throw new Error('無法從 URL 提取小說 ID');
    }
  }

  getSiteType(): SiteType {
    return SiteType.KADOKADO;
  }

  getContentType(): ContentType {
    return ContentType.NOVEL;
  }

  async getContentInfo(): Promise<ContentInfo> {
    const html = await this.getPage(this.url);
    const $ = cheerio.load(html);
    const selector = selectors.kadokado.info;

    return {
      title: $(selector.title).text().trim(),
      author: $(selector.author).text().trim(),
      description: $(selector.description).text().trim(),
      genre: $(selector.genre).text().trim(),
      status: $(selector.status).text().trim(),
      url: this.url,
      additionalInfo: {
        totalChapters: $(selector.totalChapters).text().trim(),
        totalWords: $(selector.totalWords).text().trim()
      }
    };
  }

  async getAllChapters(): Promise<Chapter[]> {
    const html = await this.getPage(this.url);
    return this._parseChaptersFromHtml(html);
  }

  private _parseChaptersFromHtml(html: string): Chapter[] {
    const $ = cheerio.load(html);
    const chapters: Chapter[] = [];
    const selector = selectors.kadokado.chapters;

    $(selector.container).each((index, element) => {
      chapters.push({
        no: $(element).find(selector.no).text().trim(),
        title: $(element).find(selector.title).text().trim(),
        date: $(element).find(selector.date).text().trim(),
        wordCount: $(element).find(selector.wordCount).text().trim()
      });
    });

    return chapters;
  }
}
```

## 站點適配器工廠

工廠模式用於根據 URL 檢測站點類型並創建相應的適配器實例:

```typescript
// scraper/factories/SiteAdapterFactory.ts
import { ISiteAdapter } from '../interfaces/ISiteAdapter';
import { WebtoonAdapter } from '../adapters/WebtoonAdapter';
import { KadoKadoAdapter } from '../adapters/KadoKadoAdapter';
import { SiteType } from '../models/SiteType';
import { siteUrlPatterns } from '../../core/config';

export class SiteAdapterFactory {
  /**
   * 根據 URL 創建適合的站點適配器
   */
  static createAdapter(url: string): ISiteAdapter {
    const siteType = this.detectSiteType(url);

    switch (siteType) {
      case SiteType.WEBTOON:
        return new WebtoonAdapter(url);
      case SiteType.KADOKADO:
        return new KadoKadoAdapter(url);
      default:
        throw new Error(`不支持的網站: ${url}`);
    }
  }

  /**
   * 通過 URL 檢測站點類型
   */
  static detectSiteType(url: string): SiteType {
    if (siteUrlPatterns.webtoon.test(url)) {
      return SiteType.WEBTOON;
    } else if (siteUrlPatterns.kadokado.test(url)) {
      return SiteType.KADOKADO;
    }

    throw new Error(`無法識別的網站 URL: ${url}`);
  }
}
```

## 添加新站點

如果我們想添加新網站的支持，只需遵循以下步驟：

1. **更新站點類型枚舉**:
   ```typescript
   // scraper/models/SiteType.ts
   export enum SiteType {
     WEBTOON = 'webtoon',
     KADOKADO = 'kadokado',
     NEW_SITE = 'new-site'  // 添加新站點
   }
   ```

2. **更新配置**:
   ```typescript
   // core/config.js
   export const siteUrlPatterns = {
     webtoon: /webtoons\.com/,
     kadokado: /kadokado\.com/,
     newSite: /newsite\.com/   // 添加新站點的 URL 模式
   };

   export const selectors = {
     // 現有選擇器...
     newSite: {
       info: {
         title: '.title-selector',
         author: '.author-selector',
         // ...其他選擇器
       },
       chapters: {
         container: '.chapter-item',
         no: '.chapter-no',
         // ...其他選擇器
       }
     }
   };
   ```

3. **實現適配器類**:
   創建一個新的適配器類 `NewSiteAdapter.ts`，繼承 `BaseAdapter` 並實現所有必要的方法。

4. **更新工廠**:
   更新 `SiteAdapterFactory` 以支持新站點:
   ```typescript
   static createAdapter(url: string): ISiteAdapter {
     const siteType = this.detectSiteType(url);

     switch (siteType) {
       case SiteType.WEBTOON:
         return new WebtoonAdapter(url);
       case SiteType.KADOKADO:
         return new KadoKadoAdapter(url);
       case SiteType.NEW_SITE:
         return new NewSiteAdapter(url);  // 添加新站點
       default:
         throw new Error(`不支持的網站: ${url}`);
     }
   }

   static detectSiteType(url: string): SiteType {
     // 添加新的 URL 模式檢測
     if (siteUrlPatterns.newSite.test(url)) {
       return SiteType.NEW_SITE;
     }
     // ...現有檢測
   }
   ```

## 好處與優勢

1. **靈活的抽象層**: 提供了統一的接口，同時保留了定制化的空間。
2. **模塊化設計**: 每個站點的邏輯獨立封裝，不影響其他站點。
3. **維護簡化**: 通用邏輯集中在基類中，減少重複代碼。
4. **可測試性提高**: 接口定義明確，便於進行單元測試和模擬。
5. **渐進式集成**: 可以循序漸進地將現有站點遷移到新架構，不需要一次性重寫所有代碼。