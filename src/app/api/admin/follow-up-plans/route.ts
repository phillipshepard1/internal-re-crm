import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { data: plans, error } = await supabase
      .from('follow_up_plan_templates')
      .select(`
        *,
        steps:follow_up_plan_steps(*)
      `)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching follow-up plans:', error)
      return NextResponse.json(
        { error: 'Failed to fetch follow-up plans' },
        { status: 500 }
      )
    }

    // Sort steps for each plan
    const plansWithSortedSteps = (plans || []).map((plan: any) => ({
      ...plan,
      steps: (plan.steps || []).sort((a: any, b: any) => a.step_order - b.step_order)
    }))

    return NextResponse.json({
      plans: plansWithSortedSteps
    })

  } catch (error) {
    console.error('Error in follow-up plans API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, steps } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Create the plan template
    const { data: plan, error: planError } = await supabase
      .from('follow_up_plan_templates')
      .insert([{
        name,
        description: description || null
      }])
      .select()
      .single()

    if (planError) {
      console.error('Error creating follow-up plan:', planError)
      return NextResponse.json(
        { error: 'Failed to create follow-up plan' },
        { status: 500 }
      )
    }

    // Create the steps if provided
    if (steps && Array.isArray(steps) && steps.length > 0) {
      const stepsWithPlanId = steps.map((step: any, index: number) => ({
        plan_id: plan.id,
        step_order: index + 1,
        type: step.type || 'call',
        title: step.title || `Step ${index + 1}`,
        description: step.description || null,
        days_after_assignment: step.days_after_assignment || 1,
        notes: step.notes || null
      }))

      const { error: stepsError } = await supabase
        .from('follow_up_plan_steps')
        .insert(stepsWithPlanId)

      if (stepsError) {
        console.error('Error creating plan steps:', stepsError)
        // Don't fail the whole request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      plan
    })

  } catch (error) {
    console.error('Error in follow-up plans API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 