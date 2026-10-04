// Data access for the site. Every page reads through these functions; they come
// from Supabase once its keys are configured, and from the sample data until then.
// Server-only: client components import helpers from ./shared and types from ./types.

import { supabaseConfigured } from "@/lib/supabase/config"
import * as mockSource from "./source-mock"
import * as supabaseSource from "./source-supabase"

export type * from "./types"
export { localize, GOLDEN_VISA_THRESHOLD, isGoldenVisaEligible, SAMPLE_DATA } from "./shared"

// Typed against the mock source, so both sources must keep identical signatures.
const source: typeof mockSource = supabaseConfigured ? supabaseSource : mockSource

export const getProperties = source.getProperties
export const getProperty = source.getProperty
export const getFeaturedProperties = source.getFeaturedProperties
export const getSimilarProperties = source.getSimilarProperties
export const getCommunities = source.getCommunities
export const getCommunity = source.getCommunity
export const getDevelopers = source.getDevelopers
export const getDeveloper = source.getDeveloper
export const getProjects = source.getProjects
export const getProject = source.getProject
export const getFunnels = source.getFunnels
export const getFunnel = source.getFunnel
export const getAgents = source.getAgents
export const getAgent = source.getAgent
export const getAdvisorReviews = source.getAdvisorReviews
export const getPosts = source.getPosts
export const getPost = source.getPost
export const getReports = source.getReports
export const getJobs = source.getJobs
export const getJob = source.getJob
export const getCompanyStats = source.getCompanyStats
export const getNameMaps = source.getNameMaps
export const getPromises = source.getPromises
export const getProjectProgress = source.getProjectProgress
