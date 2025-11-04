# Setup Super Admin User

## Quick Start

To create the super admin user in your MongoDB database, follow these steps:

### 1. Run the Seed Script

```bash
cd SERVER
node seed.js
```

### 2. Super Admin Credentials

After running the seed script, you can login with:

```
Email: nikhil17607@gmail.com
Password: admin123
Role: super_admin
```

### 3. What the Seed Script Does

The seed script will:
- ✅ Clear all existing data (Users, Beaches, Bookings, Alerts, Finance)
- ✅ Create a super admin user with the credentials above
- ✅ Create 5 sample beaches
- ✅ Create 3 sample bookings
- ✅ Create 4 sample alerts
- ✅ Create 5 sample finance records

### 4. Login to Your Application

1. Go to `http://localhost:3000/signin`
2. Enter:
   - Email: `nikhil17607@gmail.com`
   - Password: `admin123`
3. Click "Sign In"
4. You'll be redirected to the dashboard with full super admin access

### 5. Verify Super Admin Access

Once logged in, you should be able to:
- ✅ View Dashboard
- ✅ Manage Beaches (Add, Edit, Delete)
- ✅ Add New Admins
- ✅ Manage Bookings
- ✅ View Finance Reports
- ✅ Manage Admins

### Important Notes

⚠️ **Warning**: Running the seed script will **DELETE ALL EXISTING DATA** in your database. Only run this on a fresh database or when you want to reset everything.

### Troubleshooting

#### Issue: "MongoDB connection error"
**Solution**: Make sure your MongoDB is running and the `MONGODB_URI` in your `.env` file is correct.

```bash
# Check your .env file
MONGODB_URI=mongodb://localhost:27017/sunshelter
# or
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sunshelter
```

#### Issue: "User already exists"
**Solution**: The seed script clears all users first. If you get this error, manually delete the user from MongoDB:

```javascript
// In MongoDB shell or Compass
db.users.deleteMany({ email: 'nikhil17607@gmail.com' })
```

Then run the seed script again.

#### Issue: Can't login after seeding
**Solution**: 
1. Check that the seed script completed successfully (look for "Seed Data Summary" in console)
2. Verify the user exists in MongoDB
3. Make sure you're using the exact credentials: `nikhil17607@gmail.com` / `admin123`
4. Check browser console for any errors

### Password Security

The password `admin123` is automatically hashed using bcrypt before being stored in the database. The User model has a pre-save hook that handles this:

```javascript
// In models/User.js
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
```

### Changing Super Admin Credentials

To use different credentials, edit `SERVER/seed.js`:

```javascript
const admin = await User.create({
  email: 'your-email@example.com',  // Change this
  password: 'your-password',         // Change this
  name: 'Your Name',                 // Change this
  role: 'super_admin'                // Keep this as super_admin
});
```

Then run `node seed.js` again.

### Production Setup

For production, you should:
1. Create the super admin manually (not via seed script)
2. Use a strong password
3. Store credentials securely
4. Enable 2FA if possible
5. Regularly rotate passwords

### Next Steps

After logging in as super admin:
1. Create additional admin users via "Add New Admin"
2. Add your actual beaches via "Add New Beach"
3. Configure beach zones and sunbeds
4. Start managing bookings
5. Monitor finance reports

---

**Need Help?** Check the main README.md or contact support.
