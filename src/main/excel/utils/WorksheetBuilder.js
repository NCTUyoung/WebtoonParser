/**
 * Worksheet Builder
 * Implements the Builder pattern for worksheet operations
 */

class WorksheetBuilder {
  /**
   * Constructor
   * @param {Object} worksheet - Excel worksheet object
   * @param {Function} logFunction - Logging function
   */
  constructor(worksheet, logFunction) {
    this.worksheet = worksheet;
    this.log = logFunction || console.log;
  }

  /**
   * Add columns to the worksheet
   * @param {Array} columns - Array of column definitions
   * @returns {WorksheetBuilder} - Returns this instance for chaining
   */
  addColumns(columns) {
    if (!columns || !Array.isArray(columns)) {
      this.log('Warning: Invalid columns definition');
      return this;
    }

    this.worksheet.columns = columns;
    return this;
  }

  /**
   * Apply header row styling
   * @param {Object} styles - Styles to apply (optional)
   * @returns {WorksheetBuilder} - Returns this instance for chaining
   */
  styleHeader(styles = { bold: true }) {
    const headerRow = this.worksheet.getRow(1);
    headerRow.font = styles;
    headerRow.commit();
    return this;
  }

  /**
   * Add a data row to the worksheet
   * @param {Object|Array} rowData - Row data object or array
   * @returns {Object} - The added row object
   */
  addRow(rowData) {
    try {
      // 记录添加前的行数
      const initialRowCount = this.worksheet.rowCount || 0;
      
      // 添加行
      const row = this.worksheet.addRow(rowData);
      row.commit();
      
      // 确认行添加后的行数
      const newRowCount = this.worksheet.rowCount || 0;
      
      if (newRowCount <= initialRowCount) {
        this.log(`WARNING: Row may not have been added correctly. Row count before: ${initialRowCount}, after: ${newRowCount}`);
      } else {
        this.log(`Row added - ${newRowCount - initialRowCount} row(s) added successfully`);
      }
      
      return row;
    } catch (error) {
      this.log(`Error adding row: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add new columns to existing header row using column map
   * @param {Object} columnMap - Map of column names to indices
   * @param {Array} newColumns - Array of new column definitions
   * @returns {Number} - Number of columns added
   */
  addColumnsToExistingHeader(columnMap, newColumns) {
    if (!columnMap || !newColumns || !Array.isArray(newColumns)) {
      return 0;
    }

    let columnsAdded = 0;
    const headerRow = this.worksheet.getRow(1);

    newColumns.forEach(col => {
      if (!Object.keys(columnMap).includes(col.header)) {
        const nextCol = Object.keys(columnMap).length + 1;
        const cell = headerRow.getCell(nextCol);
        cell.value = col.header;
        cell.font = { bold: true };
        columnMap[col.header] = nextCol;
        columnsAdded++;
      }
    });

    if (columnsAdded > 0) {
      headerRow.commit();
    }

    return columnsAdded;
  }

  /**
   * Get the column map from an existing worksheet
   * @returns {Object} - Map of column names to column indices
   */
  getColumnMap() {
    const columnMap = {};
    const headerRow = this.worksheet.getRow(1);

    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) {
        columnMap[cell.value.toString()] = colNumber;
      }
    });

    return columnMap;
  }

  /**
   * Build an array-based row from column map and data
   * @param {Object} columnMap - Map of column names to indices
   * @param {Object} data - Data to map to columns
   * @returns {Array} - Array representation of the row
   */
  buildRowFromMap(columnMap, data) {
    const rowArray = [];
    
    // Initialize array with undefined values
    for (let i = 0; i < Object.keys(columnMap).length; i++) {
      rowArray.push(undefined);
    }
    
    // Map data to correct columns
    Object.keys(columnMap).forEach(colName => {
      const colIndex = columnMap[colName] - 1;
      if (data[colName] !== undefined) {
        rowArray[colIndex] = data[colName];
      }
    });
    
    return rowArray;
  }
}

module.exports = WorksheetBuilder; 