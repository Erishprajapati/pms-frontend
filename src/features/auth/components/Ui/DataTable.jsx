import { useState, useEffect } from "react";
import PropTypes from "prop-types";

export default function DataTable({
  initialData = [],
  columns = [],
  actionMenus = [],
  primaryAction = null,
  loading = false,
  onSort,
}) {
  const [data, setData] = useState([...initialData]);
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("asc");

  // Sync data when initialData changes
  useEffect(() => {
    setData([...initialData]);
  }, [initialData]);

  const handleSort = (key) => {
    let newDirection = "asc";
    if (sortField === key) {
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    }

    const sorted = [...data].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];

      // Handle boolean fields
      if (key === "isActive") {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      }

      if (aValue < bValue) return newDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return newDirection === "asc" ? 1 : -1;
      return 0;
    });

    setSortField(key);
    setSortDirection(newDirection);
    setData(sorted);
    if (onSort) onSort(key);
  };

  const formatValue = (value) => {
    if (typeof value === "boolean") {
      return value ? "✅" : "❌";
    }
    return value ?? "—";
  };

  return (
    <div className="card px-0">
      {/* Primary Action Button */}
      {primaryAction && (
        <div className="dt-controls px-6 mb-4">
          <button className={primaryAction.className} onClick={primaryAction.onClick}>
            {primaryAction.label}
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="dt-overflow mt-2 overflow-x-auto rounded-lg max-w-full">
        {data.length === 0 && !loading ? (
          <div className="text-center p-8 text-gray-500 bg-white">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-lg">No data available</p>
          </div>
        ) : (
          <table className="dt-table w-full min-w-max border-collapse">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={col.sortable ? "sortable cursor-pointer" : ""}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="sort-indicator ml-2">
                          {sortField === col.key ? (
                            sortDirection === "asc" ? (
                              "↑"
                            ) : (
                              "↓"
                            )
                          ) : (
                            <span className="text-gray-400">↕</span>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {actionMenus.length > 0 && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key}>{formatValue(row[col.key])}</td>
                  ))}
                  {actionMenus.length > 0 && (
                    <td className="action-buttons">
                      {actionMenus.map((menu, idx) => (
                        <button
                          key={idx}
                          className={`${menu.className} mr-2 mb-1`}
                          onClick={() => menu.onClick(row.id)}
                        >
                          {menu.label}
                        </button>
                      ))}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Prop validation (optional but recommended)
DataTable.propTypes = {
  initialData: PropTypes.array,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      sortable: PropTypes.bool,
    })
  ),
  actionMenus: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      className: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
    })
  ),
  primaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    className: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
  }),
  loading: PropTypes.bool,
  onSort: PropTypes.func,
};