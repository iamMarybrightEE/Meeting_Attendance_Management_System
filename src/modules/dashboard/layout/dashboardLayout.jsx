"use client";

import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Grid,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Pagination,
  Skeleton,
} from "@mui/material";

import {
  Menu,
  Notifications,
  Dashboard,
  People,
  Settings,
  Logout,
} from "@mui/icons-material";

const drawerWidth = 260;

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const toggleDrawer = () => setMobileOpen(!mobileOpen);

  const sidebar = (
    <div className="h-full bg-white border-r border-gray-200">
      <Typography variant="h5" className="px-6 font-semibold text-primary">
        Admin Panel
      </Typography>
      <List>
        {[
          { icon: <Dashboard />, label: "Dashboard" },
          { icon: <People />, label: "Users" },
          { icon: <Settings />, label: "Settings" },
          { icon: <Logout />, label: "Logout" },
        ].map((item) => (
          <ListItemButton
            key={item.label}
            className="hover:bg-gray-100 rounded-lg mx-2 my-1 transition-colors"
          >
            <ListItemIcon className="text-gray-600">{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ className: "text-gray-800 font-medium" }}
            />
          </ListItemButton>
        ))}
      </List>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={1}
        sx={{ bgcolor: "#ffffff", color: "#000", borderBottom: "1px solid #e5e7eb" }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={toggleDrawer}
            className="md:hidden"
          >
            <Menu />
          </IconButton>

          <Typography variant="h6" className="flex-1 font-semibold">
           System Administrator
          </Typography>

          <Tooltip title="Notifications">
            <IconButton>
              <Badge badgeContent={4} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Profile">
            <Avatar className="ml-3 cursor-pointer bg-primary text-white">
              A
            </Avatar>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Sidebar Desktop */}
      <Drawer
        variant="permanent"
        className="hidden md:block"
        sx={{
          width: drawerWidth,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            borderRight: "1px solid #e5e7eb",
          },
        }}
        open
      >
        <Toolbar />
        {sidebar}
      </Drawer>

      {/* Sidebar Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={toggleDrawer}
        className="md:hidden"
        sx={{ "& .MuiDrawer-paper": { width: drawerWidth } }}
      >
        {sidebar}
      </Drawer>

      {/* Main Content */}
      <main className="flex-1 p-6 mt-16 ">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Typography variant="h5" fontWeight={600}>
            Users
          </Typography>
          <Button variant="contained" color="primary">
            Add User
          </Button>
        </div>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          className="mb-4"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="All Users" />
          <Tab label="Active Users" />
          <Tab label="Inactive" />
        </Tabs>

        {/* Table Skeleton / Content */}
        <Paper className="p-6 shadow-sm rounded-lg">
          {loading ? (
            <Grid container spacing={2}>
              {[...Array(5)].map((_, i) => (
                <Grid item xs={12} key={i}>
                  <Skeleton height={50} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="textSecondary">
              User table goes here
            </Typography>
          )}
        </Paper>

        {/* Pagination */}
        <div className="flex justify-center mt-6">
          <Pagination count={10} color="primary" />
        </div>
      </main>
    </div>
  );
}