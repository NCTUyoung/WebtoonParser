import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime
import logging

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename=f'scraping_{datetime.now().strftime("%Y%m%d")}.log'
)

class WebScraper:
    def __init__(self, url):
        self.url = url
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    
    def get_page_content(self):
        """獲取網頁內容"""
        try:
            response = requests.get(self.url, headers=self.headers)
            response.raise_for_status()  # 檢查請求是否成功
            response.encoding = 'utf-8'  # 設置編碼
            return response.text
        except requests.RequestException as e:
            logging.error(f"獲取網頁時發生錯誤: {e}")
            return None
    
    def parse_content(self, html_content):
        """解析網頁內容"""
        if not html_content:
            return None
        
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            # 在這裡添加你的解析邏輯
            # 例如：
            # titles = soup.find_all('h2', class_='title')
            # data = [title.text.strip() for title in titles]
            return soup
        except Exception as e:
            logging.error(f"解析內容時發生錯誤: {e}")
            return None
    
    def save_to_csv(self, data, filename):
        """保存數據到CSV文件"""
        try:
            df = pd.DataFrame(data)
            df.to_csv(filename, index=False, encoding='utf-8-sig')
            logging.info(f"數據已保存到 {filename}")
        except Exception as e:
            logging.error(f"保存數據時發生錯誤: {e}")

def main():
    # 使用示例
    url = "https://example.com"  # 替換為你要爬取的網址
    scraper = WebScraper(url)
    
    # 獲取網頁內容
    html_content = scraper.get_page_content()
    if html_content:
        # 解析內容
        soup = scraper.parse_content(html_content)
        if soup:
            # 在這裡添加你的數據提取邏輯
            # 例如：
            # data = {'title': [], 'content': []}
            # articles = soup.find_all('article')
            # for article in articles:
            #     data['title'].append(article.h2.text)
            #     data['content'].append(article.p.text)
            
            # 保存數據
            # scraper.save_to_csv(data, 'output.csv')
            pass

if __name__ == "__main__":
    main() 