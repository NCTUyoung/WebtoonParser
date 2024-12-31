import unittest
from unittest.mock import Mock, patch
import sys
import os

# 添加父目錄到路徑中，以便導入被測試的模組
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from webtoon_scraper import WebtoonScraper

class TestWebtoonScraper(unittest.TestCase):
    def setUp(self):
        """測試前的設置"""
        self.base_url = "https://www.webtoons.com/zh-hant/bl-gl/friday-night/list"
        self.title_no = "6875"
        self.scraper = WebtoonScraper(self.base_url, self.title_no)
        
    def test_get_url(self):
        """測試URL生成"""
        expected_url = f"{self.base_url}?title_no={self.title_no}&page=1"
        self.assertEqual(self.scraper.get_url(1), expected_url)
        
    @patch('requests.get')
    def test_get_page_content(self, mock_get):
        """測試頁面內容獲取"""
        # 模擬請求響應
        mock_response = Mock()
        mock_response.text = "<html><body>Test Content</body></html>"
        mock_response.encoding = 'utf-8'
        mock_get.return_value = mock_response
        
        content = self.scraper.get_page_content()
        self.assertIsNotNone(content)
        self.assertIn("Test Content", content)
        
    def test_parse_content(self):
        """測試內容解析"""
        test_html = """
        <html>
            <body>
                <h1 class="subj">Test Title</h1>
                <span class="ico_view"><em>1000</em></span>
                <span class="ico_subscribe"><em>500</em></span>
                <li class="_episodeItem">
                    <span class="subj">Chapter 1</span>
                    <span class="date">2024.03.01</span>
                    <span class="like_area">100</span>
                    <span class="tx">1</span>
                </li>
            </body>
        </html>
        """
        
        soup = self.scraper.parse_content(test_html)
        self.assertIsNotNone(soup)
        self.assertEqual(soup.find('h1', class_='subj').text, "Test Title")
        
    def test_get_webtoon_info(self):
        """測試漫畫信息獲取"""
        test_html = """
        <html>
            <body>
                <h1 class="subj">Test Webtoon</h1>
                <span class="ico_view"><em>1000</em></span>
                <span class="ico_subscribe"><em>500</em></span>
                <em class="cnt">9.9</em>
                <p class="day_info">每週五更新</p>
                <p class="summary">Test Description</p>
            </body>
        </html>
        """
        
        soup = self.scraper.parse_content(test_html)
        info = self.scraper.get_webtoon_info(soup)
        
        self.assertIsNotNone(info)
        self.assertEqual(info['標題'], "Test Webtoon")
        self.assertEqual(info['觀看數'], "1000")
        self.assertEqual(info['訂閱數'], "500")
        
    def test_parse_webtoon_content(self):
        """測試章節內容解析"""
        test_html = """
        <html>
            <body>
                <li class="_episodeItem">
                    <span class="subj">Chapter 1</span>
                    <span class="date">2024.03.01</span>
                    <span class="like_area">100</span>
                    <span class="tx">1</span>
                </li>
            </body>
        </html>
        """
        
        soup = self.scraper.parse_content(test_html)
        content = self.scraper.parse_webtoon_content(soup)
        
        self.assertIsNotNone(content)
        self.assertEqual(content['章節標題'][0], "Chapter 1")
        self.assertEqual(content['發布日期'][0], "2024.03.01")
        self.assertEqual(content['點讚數'][0], "100")
        self.assertEqual(content['章節編號'][0], "1")

if __name__ == '__main__':
    unittest.main() 