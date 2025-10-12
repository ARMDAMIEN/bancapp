import { Component, OnInit } from '@angular/core';
import { UserService, UserProfile } from '../../../services/user.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  userProfile: UserProfile | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('=== PROFILE COMPONENT: Starting to load user profile ===');

    this.userService.getCurrentUserProfile().subscribe({
      next: (profile) => {
        console.log('=== PROFILE COMPONENT: Profile loaded successfully ===');
        console.log('Full profile object:', profile);
        console.log('Profile properties:');
        console.log('  - firstName:', profile.firstName);
        console.log('  - lastName:', profile.lastName);
        console.log('  - email:', profile.email);
        console.log('  - companyName:', profile.companyName);
        console.log('  - companyAddress:', profile.companyAddress);
        console.log('  - companyCreationDate:', profile.companyCreationDate);
        console.log('  - accountBalance:', profile.accountBalance);
        console.log('  - selectedOffer:', profile.selectedOffer);

        // Check if companyAddress exists
        if (profile.companyAddress) {
          console.log('✓ companyAddress is present:', profile.companyAddress);
        } else {
          console.warn('⚠ companyAddress is missing or null/undefined');
          console.log('  companyAddress value:', profile.companyAddress);
          console.log('  companyAddress type:', typeof profile.companyAddress);
        }

        this.userProfile = profile;
        this.isLoading = false;

        console.log('=== PROFILE COMPONENT: Profile assigned to component ===');
      },
      error: (error) => {
        console.error('=== PROFILE COMPONENT: Error loading user profile ===');
        console.error('Error object:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error response:', error.error);

        this.errorMessage = error.error?.message || 'Failed to load user profile. Please try again.';
        this.isLoading = false;
      }
    });
  }

  getUserInitials(): string {
    if (!this.userProfile) return 'U';
    const firstInitial = this.userProfile.firstName?.charAt(0) || '';
    const lastInitial = this.userProfile.lastName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase();
  }

  getFullName(): string {
    if (!this.userProfile) return '';
    return `${this.userProfile.firstName} ${this.userProfile.lastName}`;
  }

  formatDate(dateString: string | undefined | any[]): string {
    if (!dateString) return 'N/A';

    // Check if dateString is an array (Java LocalDate format: [year, month, day])
    if (Array.isArray(dateString)) {
      if (dateString.length === 3) {
        const [year, month, day] = dateString;
        // Month in JavaScript Date is 0-indexed, but Java sends 1-indexed
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return 'Invalid date format';
    }

    // Handle string dates
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getAccountStatus(): string {
    if (!this.userProfile) return 'Unknown';
    if (this.userProfile.currentSubstep === 'suspended') return 'Suspended';
    if (this.userProfile.hasSigned) return 'Active';
    return 'Pending';
  }

  getAccountStatusClass(): string {
    const status = this.getAccountStatus();
    if (status === 'Active') return 'status-active';
    if (status === 'Suspended') return 'status-suspended';
    return 'status-pending';
  }
}
