"use client"

import type { Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// import { DataTableViewOptions } from "@/components/data-table-view-options" // If you have this component

// import { priorities, statuses } from "../data/data" // Replace with your data
// import { DataTableFacetedFilter } from "./data-table-faceted-filter" // If you use faceted filters

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  filterColumnId?: string // e.g., "name" or "title"
  filterPlaceholder?: string
  children?: React.ReactNode // For custom buttons like "Add Patient"
}

export function DataTableToolbar<TData>({
  table,
  filterColumnId = "name", // Default filter column
  filterPlaceholder = "Filter...",
  children,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder={filterPlaceholder}
          value={(table.getColumn(filterColumnId)?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn(filterColumnId)?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {/* Example of faceted filters, adapt if needed */}
        {/* {table.getColumn("status") && (
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Status"
            options={statuses} // Your statuses options
          />
        )}
        {table.getColumn("priority") && (
          <DataTableFacetedFilter
            column={table.getColumn("priority")}
            title="Priority"
            options={priorities} // Your priorities options
          />
        )} */}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {children} {/* For custom action buttons */}
        {/* <DataTableViewOptions table={table} /> */} {/* If you have view options */}
      </div>
    </div>
  )
}
