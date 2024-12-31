import unittest
from unittest.mock import Mock, patch
import tkinter as tk
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from webtoon_gui import WebtoonScraperGUI

class TestWebtoonScraperGUI(unittest.TestCase):
    def setUp(self):
        """測試前的設置"""
        self.root = tk.Tk()
        self.app = WebtoonScraperGUI(self.root)
        
    def tearDown(self):
        """測試後的清理"""
        if self.root:
            self.root.update()  # 處理所有待處理的事件
            self.root.destroy()
            self.root = None
        
    def test_initial_values(self):
        """測試初始值設置"""
        self.assertEqual(self.app.day_var.get(), "五")
        self.assertEqual(self.app.hour_var.get(), "18")
        self.assertEqual(self.app.minute_var.get(), "00")
        self.assertEqual(self.app.timezone_var.get(), "Asia/Taipei")
        
    def test_toggle_schedule(self):
        """測試定時任務切換"""
        # 測試啟動定時
        self.app.toggle_schedule()
        self.assertTrue(self.app.schedule_running)
        self.assertEqual(self.app.schedule_button['text'], "停止定時")
        
        # 測試停止定時
        self.app.toggle_schedule()
        self.assertFalse(self.app.schedule_running)
        self.assertEqual(self.app.schedule_button['text'], "啟動定時")
        
    @patch('webtoon_scraper.WebtoonScraper')
    def test_scrape_data(self, mock_scraper):
        """測試數據爬取"""
        # 模擬爬蟲返回數據
        mock_scraper.return_value.get_webtoon_info.return_value = {
            '標題': 'Test Webtoon',
            '觀看數': '1000',
            '訂閱數': '500'
        }
        mock_scraper.return_value.scrape_all_pages.return_value = {
            '章節標題': ['Chapter 1'],
            '發布日期': ['2024.03.01'],
            '點讚數': ['100'],
            '章節編號': ['1']
        }
        
        # 執行爬取
        self.app.url_entry.delete(0, tk.END)
        self.app.url_entry.insert(0, "https://www.webtoons.com/zh-hant/romance/w-wish/list?title_no=1709")
        self.app.scrape_data(self.app.url_entry.get())
        
        # 驗證日誌消息
        log_text = self.app.log_text.get("1.0", tk.END)
        self.assertIn("開始獲取漫畫信息", log_text)
    
    def test_schedule_time_conversion(self):
        """測試時區轉換"""
        # 設置測試時間
        self.app.hour_var.set("20")  # 設置為晚上8點
        self.app.minute_var.set("00")
        self.app.timezone_var.set("Asia/Tokyo")  # 設置為東京時區
        
        # 啟動定時
        with patch('schedule.every') as mock_schedule:
            self.app.start_schedule()
            
            # 驗證時區轉換（東京比台北快一小時）
            log_text = self.app.log_text.get("1.0", tk.END)
            self.assertIn("本地時間: 19:00", log_text)
    
    @patch('schedule.every')
    def test_schedule_creation(self, mock_schedule):
        """測試定時任務創建"""
        # 設置測試數據
        self.app.day_var.set("五")
        self.app.hour_var.set("18")
        self.app.minute_var.set("30")
        
        # 啟動定時
        self.app.start_schedule()
        
        # 驗證schedule.every()被正確調用
        mock_schedule.assert_called_once()
        
        # 驗證定時狀態
        self.assertTrue(self.app.schedule_running)
        self.assertEqual(self.app.schedule_button['text'], "停止定時")
    
    def test_schedule_status_update(self):
        """測試定時狀態更新"""
        # 啟動定時
        self.app.start_schedule()
        status_text = self.app.schedule_status_var.get()
        self.assertIn("定時已啟動", status_text)
        self.assertIn(self.app.day_var.get(), status_text)
        
        # 停止定時
        self.app.stop_schedule()
        self.assertEqual(self.app.schedule_status_var.get(), "定時未啟動")
    
    @patch('threading.Thread')
    def test_schedule_thread(self, mock_thread):
        """測試定時線程創建"""
        self.app.start_schedule()
        
        # 驗證線程創建
        mock_thread.assert_called_once()
        
        # 獲取創建線程時的參數
        call_args = mock_thread.call_args
        self.assertIsNotNone(call_args)
        
        # 驗證參數
        args, kwargs = call_args
        self.assertEqual(kwargs.get('target'), self.app.run_schedule)
        self.assertTrue(
            kwargs.get('daemon', False),
            "Thread should be created with daemon=True"
        )
        
        # 驗證線程啟動
        mock_thread.return_value.start.assert_called_once()
    
    def test_invalid_schedule_time(self):
        """測試無效的定時設置"""
        # 設置無效的小時
        self.app.hour_var.set("25")
        with self.assertRaises(ValueError):
            self.app.start_schedule()
        
        # 設置無效的分鐘
        self.app.hour_var.set("18")
        self.app.minute_var.set("61")
        with self.assertRaises(ValueError):
            self.app.start_schedule()
    
    @patch('time.sleep')
    def test_schedule_running(self, mock_sleep):
        """測試定時運行邏輯"""
        # 模擬定時運行
        self.app.schedule_running = True
        
        def stop_after_one_iteration(*args):
            self.app.schedule_running = False
            
        mock_sleep.side_effect = stop_after_one_iteration
        
        self.app.run_schedule()
        
        # 驗證sleep被調用
        mock_sleep.assert_called_once_with(30)
    
    def test_multiple_schedule_starts(self):
        """測試多次啟動定時"""
        # 第一次啟動
        self.app.start_schedule()
        first_status = self.app.schedule_status_var.get()
        
        # 再次啟動（應該先停止再啟動）
        self.app.start_schedule()
        second_status = self.app.schedule_status_var.get()
        
        # 驗證狀態更新
        self.assertEqual(first_status, second_status)
        
    def test_schedule_cleanup(self):
        """測試定時任務清理"""
        self.app.start_schedule()
        self.app.stop_schedule()
        
        # 驗證清理
        self.assertFalse(self.app.schedule_running)
        self.assertEqual(self.app.schedule_button['text'], "啟動定時")
        self.assertEqual(self.app.schedule_status_var.get(), "定時未啟動")

if __name__ == '__main__':
    unittest.main() 