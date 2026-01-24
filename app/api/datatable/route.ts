import { NextRequest, NextResponse } from 'next/server';

// Sample data - in real app, this would come from a database
const allUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', joinDate: '2023-01-15', department: 'IT' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active', joinDate: '2023-02-20', department: 'Marketing' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager', status: 'Active', joinDate: '2023-03-10', department: 'Sales' },
  { id: 4, name: 'Alice Williams', email: 'alice@example.com', role: 'User', status: 'Inactive', joinDate: '2023-04-05', department: 'HR' },
  { id: 5, name: 'Charlie Brown', email: 'charlie@example.com', role: 'User', status: 'Active', joinDate: '2023-05-12', department: 'IT' },
  { id: 6, name: 'Diana Prince', email: 'diana@example.com', role: 'Admin', status: 'Active', joinDate: '2023-06-18', department: 'Operations' },
  { id: 7, name: 'Ethan Hunt', email: 'ethan@example.com', role: 'User', status: 'Active', joinDate: '2023-07-22', department: 'Security' },
  { id: 8, name: 'Fiona Green', email: 'fiona@example.com', role: 'Manager', status: 'Active', joinDate: '2023-08-30', department: 'Finance' },
  { id: 9, name: 'George Miller', email: 'george@example.com', role: 'User', status: 'Inactive', joinDate: '2023-09-14', department: 'Support' },
  { id: 10, name: 'Hannah Lee', email: 'hannah@example.com', role: 'User', status: 'Active', joinDate: '2023-10-08', department: 'Design' },
  { id: 11, name: 'Ian Malcolm', email: 'ian@example.com', role: 'Manager', status: 'Active', joinDate: '2023-11-20', department: 'Research' },
  { id: 12, name: 'Julia Roberts', email: 'julia@example.com', role: 'User', status: 'Active', joinDate: '2023-12-05', department: 'Marketing' },
  { id: 13, name: 'Kevin Hart', email: 'kevin@example.com', role: 'User', status: 'Inactive', joinDate: '2024-01-10', department: 'Sales' },
  { id: 14, name: 'Laura Palmer', email: 'laura@example.com', role: 'Admin', status: 'Active', joinDate: '2024-02-15', department: 'IT' },
  { id: 15, name: 'Michael Scott', email: 'michael@example.com', role: 'Manager', status: 'Active', joinDate: '2024-03-22', department: 'Operations' },
  { id: 16, name: 'Nancy Drew', email: 'nancy@example.com', role: 'User', status: 'Active', joinDate: '2024-04-10', department: 'Legal' },
  { id: 17, name: 'Oliver Twist', email: 'oliver@example.com', role: 'User', status: 'Active', joinDate: '2024-05-15', department: 'Support' },
  { id: 18, name: 'Pam Beesly', email: 'pam@example.com', role: 'User', status: 'Active', joinDate: '2024-06-20', department: 'Design' },
  { id: 19, name: 'Quinn Fabray', email: 'quinn@example.com', role: 'Manager', status: 'Inactive', joinDate: '2024-07-25', department: 'HR' },
  { id: 20, name: 'Rachel Green', email: 'rachel@example.com', role: 'User', status: 'Active', joinDate: '2024-08-30', department: 'Marketing' },
  { id: 21, name: 'Steve Rogers', email: 'steve@example.com', role: 'Admin', status: 'Active', joinDate: '2024-09-05', department: 'Security' },
  { id: 22, name: 'Tony Stark', email: 'tony@example.com', role: 'Admin', status: 'Active', joinDate: '2024-10-10', department: 'IT' },
  { id: 23, name: 'Uma Thurman', email: 'uma@example.com', role: 'Manager', status: 'Active', joinDate: '2024-11-15', department: 'Operations' },
  { id: 24, name: 'Victor Hugo', email: 'victor@example.com', role: 'User', status: 'Inactive', joinDate: '2024-12-20', department: 'Research' },
  { id: 25, name: 'Wanda Maximoff', email: 'wanda@example.com', role: 'User', status: 'Active', joinDate: '2025-01-05', department: 'Finance' },
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || '';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Filter data based on search
    let filteredData = allUsers;
    if (search) {
      filteredData = allUsers.filter((user) =>
        Object.values(user).some((value) =>
          value.toString().toLowerCase().includes(search.toLowerCase())
        )
      );
    }

    // Sort data
    if (sortBy) {
      filteredData = [...filteredData].sort((a, b) => {
        const aValue = a[sortBy as keyof typeof a];
        const bValue = b[sortBy as keyof typeof b];

        if (aValue === bValue) return 0;

        const comparison = aValue > bValue ? 1 : -1;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    // Calculate pagination
    const total = filteredData.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

    // Simulate network delay (remove in production)
    await new Promise((resolve) => setTimeout(resolve, 300));

    return NextResponse.json({
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
