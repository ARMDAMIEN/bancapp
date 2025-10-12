import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { StepService, FUNDING_STEPS } from '../../../services/step.service';

@Component({
  selector: 'app-ai-calculating',
  templateUrl: './ai-calculating.component.html',
  styleUrl: './ai-calculating.component.css'
})
export class AiCalculatingComponent implements OnInit, OnDestroy {
  analysisProgress: number = 0;
  currentStep: number = 1;
  neuralNodes: number[] = Array(12).fill(0);
  dataParticles: number[] = Array(8).fill(0);

  private progressInterval: any;
  private stepInterval: any;

  constructor(
    private router: Router,
    private stepService: StepService
  ) {}

  ngOnInit(): void {
    this.startAnalysisAnimation();
  }

  ngOnDestroy(): void {
    this.cleanupIntervals();
  }

  private startAnalysisAnimation(): void {
    // Progress animation
    this.progressInterval = setInterval(() => {
      if (this.analysisProgress < 100) {
        this.analysisProgress += Math.random() * 3 + 1;
        if (this.analysisProgress > 100) {
          this.analysisProgress = 100;
        }
      } else {
        this.cleanupIntervals();
        // Animation complete - transition to HUMAN_VALIDATION_PENDING step
        this.completeAnalysisAndTransition();
      }
    }, 200);

    // Step animation
    this.stepInterval = setInterval(() => {
      if (this.currentStep < 4) {
        this.currentStep++;
      }
    }, 2000);
  }

  private completeAnalysisAndTransition(): void {
    // Transition to HUMAN_VALIDATION_PENDING step
    this.stepService.transitionTo(FUNDING_STEPS.HUMAN_VALIDATION_PENDING).subscribe({
      next: () => {
        console.log('Step transitioned to HUMAN_VALIDATION_PENDING');
        // Navigate to human validation pending page
        this.router.navigate(['/human-validation-pending']);
      },
      error: (error) => {
        console.error('Failed to update step:', error);
        // Navigate anyway - user can still proceed
        this.router.navigate(['/human-validation-pending']);
      }
    });
  }

  private cleanupIntervals(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    if (this.stepInterval) {
      clearInterval(this.stepInterval);
    }
  }
}
