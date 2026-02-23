"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  HelpCircle,
  MessageSquare,
  Mail,
  FileText,
  Book,
  Video,
  Loader2,
  Send,
  ExternalLink,
  Lightbulb,
  Bug,
  Zap,
  Users,
  Calendar,
  BarChart3,
  Inbox,
  CheckCircle2,
  Smartphone,
  Globe,
  CloudSun,
  ListTodo,
  StickyNote,
  Bell,
  BotMessageSquare,
  ToggleRight,
} from "lucide-react";

const faqs = [
  {
    question: "How do I create a new task in the CRM?",
    answer: "Navigate to CRM from the sidebar, select a space, then click the '+ Add Task' button within any status column. You can also use the keyboard shortcut Ctrl/Cmd + N when in the CRM view."
  },
  {
    question: "How can I invite team members to my workspace?",
    answer: "Go to Settings > Organization from the profile dropdown. You'll find an 'Invite Members' section where you can enter email addresses and assign roles to new team members."
  },
  {
    question: "What do the different task priorities mean?",
    answer: "Tasks can have four priority levels: URGENT (red) - requires immediate attention, HIGH (orange) - important but not critical, NORMAL (blue) - standard priority, and LOW (gray) - can be addressed when time permits."
  },
  {
    question: "How do I connect my email or messaging accounts?",
    answer: "Navigate to Settings > Integrations. You'll see options to connect Gmail, Outlook, WhatsApp, Instagram, and other messaging platforms. Follow the authentication flow for each service you want to integrate."
  },
  {
    question: "Can I track task progress visually?",
    answer: "Yes! Each task has a progress bar that you can drag to update completion percentage. The bar color changes based on progress: red (<30%), yellow (30-70%), and green (>70%)."
  },
  {
    question: "How do I get notified about task updates?",
    answer: "Click the bell icon on any task to watch it. You'll receive notifications when there are status changes, new comments, or when you're assigned. You can manage notification preferences in Settings."
  },
  {
    question: "What is the Command Center?",
    answer: "The Command Center is an intelligent sidebar that surfaces important signals - blocked tasks, overdue items, communication gaps, and recent completions. Hover over the icon on the right edge of your screen to access it."
  },
  {
    question: "How do I use the AI Chat feature?",
    answer: "Click on 'AI Chat' in the sidebar to access our AI assistant. You can ask questions about your data, get help with tasks, or use it for general assistance. The AI has context about your workspace."
  }
];

const quickGuides = [
  {
    title: "Getting Started",
    description: "Learn the basics of AYA AI in 5 minutes",
    icon: Zap,
    href: "#"
  },
  {
    title: "Task Management",
    description: "Master the CRM and task workflow",
    icon: CheckCircle2,
    href: "#"
  },
  {
    title: "Team Collaboration",
    description: "Work effectively with your team",
    icon: Users,
    href: "#"
  },
  {
    title: "Inbox Management",
    description: "Handle messages across all channels",
    icon: Inbox,
    href: "#"
  },
  {
    title: "Analytics & Reporting",
    description: "Understand your performance metrics",
    icon: BarChart3,
    href: "#"
  },
  {
    title: "Calendar & Meetings",
    description: "Schedule and manage meetings",
    icon: Calendar,
    href: "#"
  }
];

const whatsappFeatures = [
  {
    title: "Web Search",
    description: "Search the internet for current events, news, or any information",
    icon: Globe,
  },
  {
    title: "Weather",
    description: "Get current weather and 3-day forecasts for any location",
    icon: CloudSun,
  },
  {
    title: "Email & Inbox",
    description: "Check recent emails, search messages across all channels",
    icon: Mail,
  },
  {
    title: "Calendar & Meetings",
    description: "View upcoming meetings, schedules, and meeting summaries",
    icon: Calendar,
  },
  {
    title: "Tasks & Projects",
    description: "Check task status, project updates, and deadlines",
    icon: ListTodo,
  },
  {
    title: "Notes & Reminders",
    description: "Save personal notes and set one-time or recurring reminders",
    icon: StickyNote,
  },
  {
    title: "Post-Meeting Summaries",
    description: "Get executive summaries with action items after meetings end",
    icon: FileText,
  },
  {
    title: "Daily Standup Digest",
    description: "Receive a morning digest with your day's overview at 8 AM",
    icon: Bell,
  },
  {
    title: "Slack & Integrations",
    description: "Send Slack messages, check channels, and manage integrations",
    icon: MessageSquare,
  },
  {
    title: "General AI Chat",
    description: "Ask anything — AYA responds in your language",
    icon: BotMessageSquare,
  },
];

const whatsappCommands = [
  {
    command: "enable meeting summaries",
    description: "Turn on post-meeting WhatsApp summaries with action items",
    alternates: "turn on meeting summaries, enable post-meeting summaries",
  },
  {
    command: "disable meeting summaries",
    description: "Turn off post-meeting WhatsApp summaries",
    alternates: "turn off meeting summaries, stop meeting summaries",
  },
  {
    command: "enable digest",
    description: "Turn on daily standup digest at 8 AM your time",
    alternates: "turn on digest, start daily digest, resume digest",
  },
  {
    command: "disable digest",
    description: "Pause the daily standup digest",
    alternates: "turn off digest, stop digest, pause digest",
  },
  {
    command: "save this: [your note]",
    description: "Save a personal note you can search later",
    alternates: "note this down, remember that...",
  },
  {
    command: "remind me [task] at [time]",
    description: "Set a reminder with WhatsApp pings (supports recurring)",
    alternates: "set a reminder, alert me at...",
  },
  {
    command: "list my notes",
    description: "View your saved notes",
    alternates: "show notes, search notes",
  },
  {
    command: "list my reminders",
    description: "View your active reminders",
    alternates: "show reminders, my reminders",
  },
];

export default function HelpPage() {
  const [feedbackType, setFeedbackType] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackType || !subject || !message) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success("Feedback submitted successfully! We'll get back to you soon.");
    setFeedbackType("");
    setSubject("");
    setMessage("");
    setIsSubmitting(false);
  };

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center pb-6 border-b border-gray-100">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <HelpCircle className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Help & Support</h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          Find answers to common questions, explore guides, or reach out to our support team
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-100 bg-blue-50/50">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Live Chat</h3>
              <p className="text-sm text-gray-600">Chat with our support team</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-green-100 bg-green-50/50">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Email Support</h3>
              <p className="text-sm text-gray-600">support@ayaai.com</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-100 bg-purple-50/50">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Book className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Documentation</h3>
              <p className="text-sm text-gray-600">Browse our full docs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Guides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-gray-600" />
            Quick Guides
          </CardTitle>
          <CardDescription>
            Step-by-step tutorials to help you get the most out of AYA AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickGuides.map((guide, index) => (
              <a
                key={index}
                href={guide.href}
                className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
              >
                <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-blue-100 transition-colors">
                  <guide.icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 group-hover:text-blue-600 flex items-center gap-1">
                    {guide.title}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-sm text-gray-500">{guide.description}</p>
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp AYA Agent */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-600" />
            WhatsApp AYA Agent
          </CardTitle>
          <CardDescription>
            Your AI assistant on WhatsApp — here&apos;s everything AYA can do and how to control it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Features Grid */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              What AYA Can Do
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {whatsappFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white border border-green-100"
                >
                  <div className="p-1.5 rounded-md bg-green-100 shrink-0">
                    <feature.icon className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-gray-900">{feature.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commands Table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ToggleRight className="w-4 h-4" />
              Quick Commands
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Send these messages to AYA on WhatsApp to enable or disable features
            </p>
            <div className="space-y-2">
              {whatsappCommands.map((cmd, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 p-3 rounded-lg bg-white border border-green-100"
                >
                  <div className="shrink-0">
                    <code className="text-sm font-mono font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
                      &quot;{cmd.command}&quot;
                    </code>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700">{cmd.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Also works: {cmd.alternates}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Getting Started Note */}
          <div className="p-4 rounded-lg bg-green-100/50 border border-green-200">
            <p className="text-sm text-green-800">
              <span className="font-semibold">Getting started:</span> Message AYA from your linked WhatsApp number. If you haven&apos;t linked yet, just send a message and AYA will ask for your account email to connect.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>
            Quick answers to common questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left hover:no-underline hover:text-blue-600">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Feedback Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            Send Feedback
          </CardTitle>
          <CardDescription>
            Report a bug, suggest a feature, or share your thoughts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feedback-type">Feedback Type</Label>
                <Select value={feedbackType} onValueChange={setFeedbackType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">
                      <div className="flex items-center gap-2">
                        <Bug className="w-4 h-4 text-red-500" />
                        Bug Report
                      </div>
                    </SelectItem>
                    <SelectItem value="feature">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        Feature Request
                      </div>
                    </SelectItem>
                    <SelectItem value="general">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                        General Feedback
                      </div>
                    </SelectItem>
                    <SelectItem value="question">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-purple-500" />
                        Question
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your feedback"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Please provide as much detail as possible..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center py-6 border-t border-gray-100">
        <p className="text-sm text-gray-500">
          Can't find what you're looking for?{" "}
          <a href="mailto:support@ayaai.com" className="text-blue-600 hover:underline">
            Contact us directly
          </a>
        </p>
        <p className="text-xs text-gray-400 mt-2">
          AYA AI • Version 1.0.0 • Response time: Usually within 24 hours
        </p>
      </div>
    </div>
  );
}
