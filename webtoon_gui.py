import tkinter as tk
from tkinter import ttk, messagebox
from webtoon_scraper import WebtoonScraper
import threading
from datetime import datetime, timezone
import schedule
import time
import pytz
from version import VERSION

class WebtoonScraperGUI:
    def __init__(self, root):
        self.root = root
        self.root.title(f"Webtoon爬蟲工具 v{VERSION}")
        self.root.geometry("650x500")  # 加大視窗高度
        
        # 創建主框架
        self.main_frame = ttk.Frame(root, padding="10")
        self.main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # URL輸入區域
        ttk.Label(self.main_frame, text="Webtoon URL:").grid(row=0, column=0, sticky=tk.W)
        self.url_entry = ttk.Entry(self.main_frame, width=50)
        self.url_entry.grid(row=0, column=1, padx=5, pady=5, sticky=tk.W)
        self.url_entry.insert(0, "https://www.webtoons.com/zh-hant/bl-gl/friday-night/list?title_no=6875")
        
        # 定時設置區域
        schedule_frame = ttk.LabelFrame(self.main_frame, text="定時設置", padding="5")
        schedule_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)
        
        # 星期選擇
        ttk.Label(schedule_frame, text="星期:").grid(row=0, column=0, padx=5)
        self.day_var = tk.StringVar(value="五")
        days = ["一", "二", "三", "四", "五", "六", "日"]
        self.day_combo = ttk.Combobox(schedule_frame, textvariable=self.day_var, values=days, width=5)
        self.day_combo.grid(row=0, column=1, padx=5)
        
        # 時間選擇
        ttk.Label(schedule_frame, text="時間:").grid(row=0, column=2, padx=5)
        self.hour_var = tk.StringVar(value="18")
        self.minute_var = tk.StringVar(value="00")
        
        # 小時選擇
        hours = [str(i).zfill(2) for i in range(24)]
        self.hour_combo = ttk.Combobox(schedule_frame, textvariable=self.hour_var, values=hours, width=5)
        self.hour_combo.grid(row=0, column=3, padx=2)
        
        ttk.Label(schedule_frame, text=":").grid(row=0, column=4)
        
        # 分鐘選擇
        minutes = [str(i).zfill(2) for i in range(0, 60, 5)]
        self.minute_combo = ttk.Combobox(schedule_frame, textvariable=self.minute_var, values=minutes, width=5)
        self.minute_combo.grid(row=0, column=5, padx=2)
        
        # 時區選擇
        ttk.Label(schedule_frame, text="時區:").grid(row=0, column=8, padx=5)
        self.timezone_var = tk.StringVar(value="Asia/Taipei")
        timezones = [
            "Asia/Taipei",
            "Asia/Tokyo",
            "Asia/Seoul",
            "Asia/Shanghai",
            "UTC"
        ]
        self.timezone_combo = ttk.Combobox(
            schedule_frame, 
            textvariable=self.timezone_var, 
            values=timezones, 
            width=12
        )
        self.timezone_combo.grid(row=0, column=9, padx=5)
        
        # 定時狀態
        self.schedule_status_var = tk.StringVar(value="定時未啟動")
        ttk.Label(schedule_frame, textvariable=self.schedule_status_var).grid(row=0, column=6, padx=10)
        
        # 定時控制按鈕
        self.schedule_button = ttk.Button(schedule_frame, text="啟動定時", command=self.toggle_schedule)
        self.schedule_button.grid(row=0, column=7, padx=5)
        
        # 進度顯示
        self.progress_var = tk.StringVar(value="準備就緒")
        ttk.Label(self.main_frame, textvariable=self.progress_var).grid(row=2, column=0, columnspan=2, sticky=tk.W)
        
        # 進度條
        self.progress_bar = ttk.Progressbar(self.main_frame, length=400, mode='indeterminate')
        self.progress_bar.grid(row=3, column=0, columnspan=2, pady=10)
        
        # 開始按鈕
        self.start_button = ttk.Button(self.main_frame, text="立即爬取", command=self.start_scraping)
        self.start_button.grid(row=4, column=0, columnspan=2, pady=10)
        
        # 日誌顯示區域
        self.log_text = tk.Text(self.main_frame, height=10, width=50)
        self.log_text.grid(row=5, column=0, columnspan=2, pady=10)
        
        # 定時任務相關
        self.schedule_running = False
        self.schedule_thread = None
        
    def toggle_schedule(self):
        """切換定時任務狀態"""
        if not self.schedule_running:
            self.start_schedule()
        else:
            self.stop_schedule()
    
    def start_schedule(self):
        """啟動定時任務"""
        day_map = {"一": "monday", "二": "tuesday", "三": "wednesday", 
                  "四": "thursday", "五": "friday", "六": "saturday", "日": "sunday"}
        
        day = day_map[self.day_var.get()]
        time_str = f"{self.hour_var.get()}:{self.minute_var.get()}"
        
        # 獲取選擇的時區
        selected_timezone = pytz.timezone(self.timezone_var.get())
        
        # 設置定時任務，考慮時區
        schedule.clear()
        
        # 將目標時間轉換為本地時間
        target_time = datetime.strptime(time_str, "%H:%M")
        target_time = selected_timezone.localize(
            datetime.now().replace(
                hour=target_time.hour,
                minute=target_time.minute,
                second=0,
                microsecond=0
            )
        )
        local_time = target_time.astimezone(pytz.timezone('Asia/Taipei'))
        local_time_str = local_time.strftime("%H:%M")
        
        # 使用轉換後的本地時間設置定時任務
        getattr(schedule.every(), day).at(local_time_str).do(self.start_scraping)
        
        self.schedule_running = True
        self.schedule_button.configure(text="停止定時")
        self.schedule_status_var.set(
            f"定時已啟動: 每{self.day_var.get()} {time_str} ({self.timezone_var.get()})"
        )
        
        # 啟動定時檢查線程
        self.schedule_thread = threading.Thread(target=self.run_schedule)
        self.schedule_thread.daemon = True
        self.schedule_thread.start()
        
        self.log_message(
            f"已設置定時爬取: 每{self.day_var.get()} {time_str} "
            f"({self.timezone_var.get()}) [本地時間: {local_time_str}]"
        )
    
    def stop_schedule(self):
        """停止定時任務"""
        self.schedule_running = False
        schedule.clear()
        self.schedule_button.configure(text="啟動定時")
        self.schedule_status_var.set("定時未啟動")
        self.log_message("已停止定時爬取")
    
    def run_schedule(self):
        """運行定時檢查"""
        while self.schedule_running:
            schedule.run_pending()
            time.sleep(30)  # 每30秒檢查一次
            
    def log_message(self, message):
        """添加日誌消息到文本框"""
        current_time = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{current_time}] {message}\n")
        self.log_text.see(tk.END)
        
    def start_scraping(self):
        """開始爬取數據"""
        url = self.url_entry.get()
        if not url:
            messagebox.showerror("錯誤", "請輸入URL")
            return
            
        self.start_button.state(['disabled'])
        self.progress_bar.start()
        self.progress_var.set("正在爬取數據...")
        
        # 在新線程中執行爬蟲
        thread = threading.Thread(target=self.scrape_data, args=(url,))
        thread.daemon = True
        thread.start()
        
    def scrape_data(self, url):
        """執行爬蟲操作"""
        try:
            # 從URL中提取title_no
            import re
            title_no = re.search(r'title_no=(\d+)', url).group(1)
            base_url = url.split('?')[0]
            
            scraper = WebtoonScraper(base_url, title_no)
            self.log_message("開始獲取漫畫信息...")
            
            # 獲取基本信息
            html_content = scraper.get_page_content()
            if html_content:
                soup = scraper.parse_content(html_content)
                if soup:
                    webtoon_info = scraper.get_webtoon_info(soup)
                    self.log_message("成功獲取漫畫基本信息")
            
            # 獲取章節信息
            self.log_message("開始獲取章節列表...")
            chapters_data = scraper.scrape_all_pages()
            
            if webtoon_info and chapters_data:
                excel_filename = f'webtoon_data_{datetime.now().strftime("%Y%m%d")}.xlsx'
                scraper.save_to_excel(webtoon_info, chapters_data, excel_filename)
                self.log_message(f"數據已保存到: {excel_filename}")
                messagebox.showinfo("完成", f"爬取完成！\n數據已保存到: {excel_filename}")
            else:
                raise Exception("無法獲取完整數據")
                
        except Exception as e:
            self.log_message(f"錯誤: {str(e)}")
            messagebox.showerror("錯誤", str(e))
        finally:
            self.root.after(0, self.finish_scraping)
            
    def finish_scraping(self):
        """完成爬取後的清理工作"""
        self.progress_bar.stop()
        self.start_button.state(['!disabled'])
        self.progress_var.set("準備就緒")

def main():
    root = tk.Tk()
    app = WebtoonScraperGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main() 