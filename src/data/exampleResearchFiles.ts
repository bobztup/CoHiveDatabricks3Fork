/**
 * Example Research Files for CoHive Testing
 * 
 * This file contains mock research files used for demonstration and testing.
 * These files are automatically loaded when no research files exist in localStorage.
 * 
 * Location: /data/exampleResearchFiles.ts
 */

export interface ResearchFile {
  id: string;
  brand: string;
  projectType: string;
  fileName: string;
  isApproved: boolean;
  uploadDate: number;
  fileType: string;
}

/**
 * Example research files for Nike and Adidas brands
 * Covers multiple project types: Creative Messaging, Product Launch, War Games, Packaging
 * Also includes files for workflow hexagons: Luminaries, Panelist, Consumers, Competitors, etc.
 */
export const exampleResearchFiles: ResearchFile[] = [
  // Creative Messaging files for Nike
  {
    id: '1',
    brand: 'Nike',
    projectType: 'Creative Messaging',
    fileName: 'Nike_Q4_2024_Consumer_Insights.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 10,
    fileType: 'Consumer Insights'
  },
  {
    id: '2',
    brand: 'Nike',
    projectType: 'Creative Messaging',
    fileName: 'Nike_Competitor_Analysis_2024.xlsx',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 15,
    fileType: 'Competitive Analysis'
  },
  {
    id: '3',
    brand: 'Nike',
    projectType: 'Creative Messaging',
    fileName: 'Nike_Social_Listening_Report_Nov.pdf',
    isApproved: false,
    uploadDate: Date.now() - 86400000 * 5,
    fileType: 'Social Media'
  },
  
  // Creative Messaging files for Adidas
  {
    id: '4',
    brand: 'Adidas',
    projectType: 'Creative Messaging',
    fileName: 'Adidas_Brand_Perception_Study.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 20,
    fileType: 'Brand Research'
  },
  
  // Product Launch files for Nike
  {
    id: '5',
    brand: 'Nike',
    projectType: 'Product Launch',
    fileName: 'Nike_Product_Testing_Results.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 7,
    fileType: 'Product Testing'
  },
  
  // War Games files for Nike
  {
    id: 'wg1',
    brand: 'Nike',
    projectType: 'War Games',
    fileName: 'Nike_Competitive_Scenario_Analysis_2024.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 12,
    fileType: 'Competitive Analysis'
  },
  {
    id: 'wg2',
    brand: 'Nike',
    projectType: 'War Games',
    fileName: 'Nike_Market_Response_Strategies.xlsx',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 8,
    fileType: 'Strategic Planning'
  },
  
  // War Games files for Adidas
  {
    id: 'wg3',
    brand: 'Adidas',
    projectType: 'War Games',
    fileName: 'Adidas_Competitor_Move_Projections.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 15,
    fileType: 'Competitive Intelligence'
  },
  {
    id: 'wg4',
    brand: 'Adidas',
    projectType: 'War Games',
    fileName: 'Adidas_Strategic_Response_Framework.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 10,
    fileType: 'Strategic Planning'
  },
  
  // Packaging files for Nike
  {
    id: 'pkg1',
    brand: 'Nike',
    projectType: 'Packaging',
    fileName: 'Nike_Sustainability_Packaging_Guidelines.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 9,
    fileType: 'Design Guidelines'
  },
  {
    id: 'pkg2',
    brand: 'Nike',
    projectType: 'Packaging',
    fileName: 'Nike_Consumer_Unboxing_Experience_Study.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 6,
    fileType: 'Consumer Research'
  },
  
  // Packaging files for Adidas
  {
    id: 'pkg3',
    brand: 'Adidas',
    projectType: 'Packaging',
    fileName: 'Adidas_Eco_Packaging_Materials_Research.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 11,
    fileType: 'Materials Research'
  },
  {
    id: 'pkg4',
    brand: 'Adidas',
    projectType: 'Packaging',
    fileName: 'Adidas_Packaging_Design_Benchmarks.xlsx',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 13,
    fileType: 'Competitive Analysis'
  },
  
  // Workflow Hexagon Files - Luminaries
  {
    id: '6',
    brand: 'Nike',
    projectType: 'Luminaries',
    fileName: 'Industry_Expert_Panel_Roster.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 12,
    fileType: 'Luminaries'
  },
  {
    id: '7',
    brand: 'Nike',
    projectType: 'Luminaries',
    fileName: 'Expert_Feedback_Summary_Q3.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 8,
    fileType: 'Luminaries'
  },
  
  // Workflow Hexagon Files - Panelist
  {
    id: '8',
    brand: 'Nike',
    projectType: 'panelist',
    fileName: 'Consumer_Panel_Demographics.xlsx',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 14,
    fileType: 'panelist'
  },
  
  // Workflow Hexagon Files - Consumers
  {
    id: '9',
    brand: 'Nike',
    projectType: 'Consumers',
    fileName: 'Consumers_Persona_Profiles_2024.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 11,
    fileType: 'Consumers'
  },
  
  // Workflow Hexagon Files - Competitors
  {
    id: '10',
    brand: 'Nike',
    projectType: 'competitors',
    fileName: 'Competitive_Landscape_Analysis.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 9,
    fileType: 'competitors'
  },
  
  // Workflow Hexagon Files - Colleagues
  {
    id: '11',
    brand: 'Nike',
    projectType: 'Colleagues',
    fileName: 'Colleagues_Stakeholder_Interviews.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 13,
    fileType: 'Colleagues'
  },
  
  // Workflow Hexagon Files - Social Voices
  {
    id: '12',
    brand: 'Nike',
    projectType: 'social',
    fileName: 'Social_Media_Sentiment_Analysis.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 6,
    fileType: 'social'
  },
  
  // Workflow Hexagon Files - Grade
  {
    id: '13',
    brand: 'Nike',
    projectType: 'Grade',
    fileName: 'Segment_Test_Methodology.pdf',
    isApproved: true,
    uploadDate: Date.now() - 86400000 * 4,
    fileType: 'Grade'
  }
];

/**
 * Get example files filtered by brand
 */
export function getExampleFilesByBrand(brand: string): ResearchFile[] {
  return exampleResearchFiles.filter(file => file.brand === brand);
}

/**
 * Get example files filtered by project type
 */
export function getExampleFilesByProjectType(projectType: string): ResearchFile[] {
  return exampleResearchFiles.filter(file => file.projectType === projectType);
}

/**
 * Get example files filtered by brand and project type
 */
export function getExampleFilesByBrandAndProjectType(brand: string, projectType: string): ResearchFile[] {
  return exampleResearchFiles.filter(file => 
    file.brand === brand && file.projectType === projectType
  );
}
