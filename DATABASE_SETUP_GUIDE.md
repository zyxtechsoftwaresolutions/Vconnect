# Database Setup Guide for VIET VConnect Portal

This guide will help you set up the complete database for the VIET VConnect Portal to make it fully functional with persistent data storage.

## Prerequisites

1. **Supabase Account**: You need a Supabase account and project
2. **Database Access**: Access to your Supabase database (SQL Editor)

## Step 1: Set Up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor**
3. Copy and paste the entire content of `complete-database-schema.sql` into the SQL editor
4. Click **Run** to execute the schema creation

This will create all the necessary tables:
- Users and authentication
- Students and faculty profiles
- Classes and timetables
- Attendance records
- Meetings and groups
- Messages and files
- Library management (books, issues)
- Fee management
- Tech news and carousel
- Faculty assignments
- Notifications

## Step 2: Insert Sample Data

1. In the SQL Editor, copy and paste the entire content of `sample-data-insertion.sql`
2. Click **Run** to populate the database with sample data

This will insert:
- Sample users (Admin, HODs, Faculty, Students, Librarian, Accountant)
- Sample students with detailed profiles
- Sample faculty members
- Sample classes and timetables
- Sample attendance records
- Sample books and tech news

## Step 3: Configure Environment Variables

Make sure your `.env` file has the correct Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 4: Test the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Test the following functionality:
   - **User Management**: Login with different roles and verify department-based access
   - **Student Management**: Add, edit, and search students
   - **Faculty Assignments**: Create and manage faculty timetables
   - **Tech News**: Add and view department-specific news
   - **Library**: Manage books and issues
   - **Attendance**: Mark and view attendance records

## Step 5: Verify Data Consistency

The new `DatabaseService` ensures that:
- Student details updated in one place are reflected everywhere
- Department-based filtering works correctly
- All data is persisted in the database
- Search functionality works across all modules

## Key Features Now Available

### 1. **Complete Data Persistence**
- All data is stored in the database instead of mock data
- Group messages, files, media, attendance, student profiles, tech news, carousel images, and class data are all persisted

### 2. **Department-Based Access Control**
- HODs and Coordinators only see data from their department
- Students and faculty are filtered by department
- Admin and Principal can see all data

### 3. **Real-time Data Consistency**
- Student profile updates are reflected in search results
- Faculty assignments are consistent across all views
- Attendance records are properly linked to students and classes

### 4. **Comprehensive Service Layer**
- `DatabaseService` provides centralized database operations
- All existing services now use the database instead of mock data
- Fallback mechanisms ensure the app works even if database is unavailable

## Troubleshooting

### Common Issues:

1. **Database Connection Errors**
   - Verify your Supabase credentials in `.env`
   - Check if your Supabase project is active
   - Ensure RLS (Row Level Security) is properly configured

2. **Permission Errors**
   - Make sure your database user has the necessary permissions
   - Check if tables were created successfully

3. **Data Not Loading**
   - Verify that sample data was inserted correctly
   - Check browser console for any errors
   - Ensure the `DatabaseService` is properly imported

### Testing Different User Roles:

1. **Admin Login**: `admin@viet.edu.in` - Can see all data
2. **HOD Login**: `hod.cse@viet.edu.in` - Can only see CSE department data
3. **Student Login**: `student1@viet.edu.in` - Can see their own data
4. **Faculty Login**: `faculty.cse1@viet.edu.in` - Can see their assignments

## Next Steps

After setting up the database:

1. **Customize Data**: Replace sample data with your actual institutional data
2. **Configure Permissions**: Set up appropriate RLS policies for security
3. **Add Features**: Extend the system with additional modules as needed
4. **Deploy**: Deploy the application with the database integration

## Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify database connectivity
3. Ensure all SQL scripts executed successfully
4. Check that environment variables are correctly set

The website is now fully functional with a complete database backend! 