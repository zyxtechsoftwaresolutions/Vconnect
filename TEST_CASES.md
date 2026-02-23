# 🧪 VIET VConnect Portal - Test Cases

## **Authentication & User Management Tests**

### **1. Login Functionality**
- **TC001**: Login with valid admin credentials
  - Email: `admin@vconnect.edu`, Password: `password`
  - Expected: Successful login, redirect to dashboard
- **TC002**: Login with valid HOD credentials
  - Email: `hod.cse@vconnect.edu`, Password: `password`
  - Expected: Successful login, department-specific access
- **TC003**: Login with valid student credentials
  - Email: `puneethreddy12603@gmail.com`, Password: `password`
  - Expected: Successful login, student dashboard
- **TC004**: Login with invalid email format
  - Email: `invalid-email`, Password: `password`
  - Expected: Error message, login failure
- **TC005**: Login with wrong password
  - Email: `admin@vconnect.edu`, Password: `wrongpassword`
  - Expected: Error message, login failure
- **TC006**: Login with non-existent user
  - Email: `nonexistent@vconnect.edu`, Password: `password`
  - Expected: Error message, login failure
- **TC007**: Login with empty email field
  - Email: ``, Password: `password`
  - Expected: Validation error, login failure
- **TC008**: Login with empty password field
  - Email: `admin@vconnect.edu`, Password: ``
  - Expected: Validation error, login failure

### **2. Session Management**
- **TC009**: Session persistence after page refresh
  - Login, refresh page
  - Expected: User remains logged in
- **TC010**: Logout functionality
  - Click logout button
  - Expected: User logged out, redirect to login page
- **TC011**: Session timeout handling
  - Leave page idle for extended time
  - Expected: Session maintained or proper timeout message

### **3. Role-Based Access Control**
- **TC012**: Admin access to all departments
  - Login as admin, navigate to different departments
  - Expected: Full access to all data
- **TC013**: HOD access to own department only
  - Login as CSE HOD, try to access ECE data
  - Expected: Access restricted to CSE department only
- **TC014**: Student access restrictions
  - Login as student, try to access admin features
  - Expected: Access denied, appropriate error message

## **Dashboard Tests**

### **4. Dashboard Loading**
- **TC015**: Dashboard loads with user data
  - Login, navigate to dashboard
  - Expected: Dashboard displays user-specific information
- **TC016**: Dashboard stats calculation
  - Check total students, faculty, classes count
  - Expected: Accurate counts based on user role and department
- **TC017**: Dashboard responsive design
  - Test on different screen sizes
  - Expected: Proper layout on mobile, tablet, desktop

### **5. User Profile Display**
- **TC018**: Student profile information display
  - Login as student, check profile section
  - Expected: Student details, attendance, academic info
- **TC019**: Faculty profile information display
  - Login as faculty, check profile section
  - Expected: Faculty details, department, subjects

## **Student Management Tests**

### **6. Student Search**
- **TC020**: Search by student name
  - Search for "Puneeth Reddy"
  - Expected: Student found and displayed
- **TC021**: Search by register ID
  - Search for "23NT1A0501"
  - Expected: Student found and displayed
- **TC022**: Search by email
  - Search for student email
  - Expected: Student found and displayed
- **TC023**: Search with no results
  - Search for "NonExistentStudent"
  - Expected: "No results found" message
- **TC024**: Search with special characters
  - Search for "O'Connor"
  - Expected: Proper handling of special characters

### **7. Student CRUD Operations**
- **TC025**: Add new student
  - Fill student form, submit
  - Expected: Student added successfully, confirmation message
- **TC026**: Edit existing student
  - Modify student details, save
  - Expected: Changes saved, updated information displayed
- **TC027**: Delete student
  - Delete student record
  - Expected: Confirmation dialog, student removed
- **TC028**: View student details
  - Click on student name
  - Expected: Detailed student profile modal opens

## **Faculty Management Tests**

### **8. Faculty Operations**
- **TC029**: View faculty list
  - Navigate to faculty section
  - Expected: List of faculty members displayed
- **TC030**: Filter faculty by department
  - Select specific department filter
  - Expected: Only faculty from selected department shown
- **TC031**: Add new faculty member
  - Fill faculty form, submit
  - Expected: Faculty added successfully
- **TC032**: Edit faculty information
  - Modify faculty details, save
  - Expected: Changes saved, updated information displayed

## **Library Management Tests**

### **9. Book Management**
- **TC033**: View book catalog
  - Navigate to library section
  - Expected: List of books displayed
- **TC034**: Search books by title
  - Search for specific book title
  - Expected: Matching books displayed
- **TC035**: Search books by author
  - Search for specific author
  - Expected: Books by author displayed
- **TC036**: Add new book
  - Fill book form, submit
  - Expected: Book added to catalog
- **TC037**: Update book information
  - Modify book details, save
  - Expected: Book information updated
- **TC038**: Delete book
  - Remove book from catalog
  - Expected: Book removed, confirmation message

### **10. Book Issue Management**
- **TC039**: Issue book to student
  - Select book and student, issue
  - Expected: Book issued, due date set
- **TC040**: Return book
  - Process book return
  - Expected: Book marked as returned, fine calculated if overdue
- **TC041**: View overdue books
  - Check overdue books list
  - Expected: List of overdue books with fine amounts

## **Attendance Management Tests**

### **11. Attendance Recording**
- **TC042**: Mark student attendance
  - Select class, date, mark attendance
  - Expected: Attendance recorded successfully
- **TC043**: Bulk attendance marking
  - Mark attendance for entire class
  - Expected: All students' attendance marked
- **TC044**: Edit attendance record
  - Modify existing attendance
  - Expected: Attendance updated, audit trail maintained
- **TC045**: View attendance reports
  - Generate attendance reports
  - Expected: Accurate attendance statistics displayed

## **Fee Management Tests**

### **12. Fee Operations**
- **TC046**: View student fee records
  - Check student fee status
  - Expected: Fee details, amounts, due dates displayed
- **TC047**: Record fee payment
  - Process fee payment
  - Expected: Payment recorded, balance updated
- **TC048**: Generate fee receipt
  - Create payment receipt
  - Expected: Receipt generated with payment details
- **TC049**: View fee reports
  - Generate fee collection reports
  - Expected: Accurate fee statistics and reports

## **General System Tests**

### **13. System Performance**
- **TC050**: Large dataset handling
  - Load system with 1000+ students
  - Expected: System responds within acceptable time limits
- **TC051**: Concurrent user access
  - Multiple users accessing system simultaneously
  - Expected: No data conflicts, proper synchronization

## **Test Execution Instructions**

### **Prerequisites**
1. Application running on development server
2. Test database with sample data
3. Test user accounts created
4. Browser developer tools enabled

### **Test Environment**
- **Browser**: Chrome, Firefox, Safari, Edge
- **Devices**: Desktop, Tablet, Mobile
- **Network**: Normal, Slow, Offline scenarios

### **Test Data Requirements**
- Sample students with various departments
- Sample faculty members
- Sample books and library data
- Sample attendance records
- Sample fee records

### **Expected Results**
- All functionality working as specified
- Proper error handling and user feedback
- Responsive design on all devices
- Data integrity maintained
- Performance within acceptable limits

### **Bug Reporting Format**
```
Test Case ID: TC001
Description: Brief description of the issue
Steps to Reproduce: Detailed steps
Expected Result: What should happen
Actual Result: What actually happened
Environment: Browser, OS, device
Severity: High/Medium/Low
Screenshots: If applicable
```










