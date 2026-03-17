'use client';

import React from 'react';
import { useProgressionStore as useStudyStore } from '../features/progression';
import { useSubjects } from '../features/content';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * SubjectNavigation component - Fixed dropdown at top of screen
 * Allows switching between subjects (floors) in the multi-floor architecture
 * Positioned outside the 3D Canvas as a 2D DOM overlay
 */
export const SubjectNavigation: React.FC = () => {
  const { data: subjects = [] } = useSubjects();
  // Get current subject ID from store
  const currentSubjectId = useStudyStore((state) => state.currentSubjectId);
  const setCurrentSubject = useStudyStore((state) => state.setCurrentSubject);

  // Get current subject object
  const currentSubject = subjects.find((s) => s.id === currentSubjectId) || null;

  // Handle subject selection
  const handleSelectSubject = (subjectId: string) => {
    setCurrentSubject(subjectId === '__all_floors__' ? null : subjectId);
  };

  return (
    <div
      data-slot="subject-navigation"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <Select value={currentSubjectId || '__all_floors__'} onValueChange={handleSelectSubject}>
        <SelectTrigger
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            backgroundColor: currentSubject
              ? `${currentSubject.color}20`
              : 'rgba(30, 41, 59, 0.9)',
            border: `1px solid ${currentSubject ? currentSubject.color : '#475569'}`,
            borderRadius: '8px',
            color: currentSubject ? currentSubject.color : '#e2e8f0',
            fontSize: '14px',
            fontWeight: 500,
            backdropFilter: 'blur(8px)',
            boxShadow: currentSubject
              ? `0 0 20px ${currentSubject.color}30`
              : '0 4px 6px rgba(0, 0, 0, 0.3)',
            minWidth: '180px',
          }}
          aria-label="Select floor"
        >
          <span style={{ fontSize: '16px' }}>🏢</span>
          <SelectValue placeholder="All Floors" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem
            value="__all_floors__"
            style={{
              color: !currentSubjectId ? '#818cf8' : '#94a3b8',
              backgroundColor: !currentSubjectId ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            }}
          >
            <span style={{ fontSize: '14px' }}>🌌</span>
            <span>All Floors</span>
          </SelectItem>

          {subjects.map((subject) => (
            <SelectItem
              key={subject.id}
              value={subject.id}
              style={{
                backgroundColor:
                  currentSubjectId === subject.id
                    ? `${subject.color}20`
                    : 'transparent',
                color: currentSubjectId === subject.id ? subject.color : '#e2e8f0',
              }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  backgroundColor: subject.color,
                  boxShadow: `0 0 8px ${subject.color}60`,
                }}
              />
              <span style={{ flex: 1 }}>{subject.name}</span>
              <span style={{ fontSize: '10px', opacity: 0.5 }}>
                {subject.geometry.gridTile}/{subject.geometry.crystal}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SubjectNavigation;
