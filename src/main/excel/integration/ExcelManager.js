// Map chapters by number/key
mapChaptersByNumber(chapters) {
  const chaptersByNumber = {};

  // Create mapping with chapter objects
  chapters.forEach((chapter, index) => {
    const chapterKey = this.formatChapterKey(index + 1);
    chaptersByNumber[chapterKey] = chapter; // 存储完整章节对象而不仅是值
  });

  return chaptersByNumber;
}

// Process chapters
processChapters(info, chapters, worksheet, columnMap, isExistingSheet, rowIndex, strategy) {
  // Skip if no chapters
  if (!chapters || chapters.length === 0) {
    this.log('No chapters to process');
    return null;
  }

  // Map chapters
  const chaptersByNumber = this.mapChaptersByNumber(chapters);

  // Map chapter values for the row
  const chapterValues = {};
  Object.keys(chaptersByNumber).forEach(key => {
    const chapter = chaptersByNumber[key];
    const value = strategy.extractValueFromChapter(chapter);
    chapterValues[key] = value;
  });

  return { chapterValues, chaptersByNumber };
}