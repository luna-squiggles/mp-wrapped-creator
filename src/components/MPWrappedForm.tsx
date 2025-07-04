import React, { useState, useEffect } from 'react';
import { mpWrappedSchema, type MPWrapped } from '../types/mp-wrapped';
import { AlertCircle, CheckCircle, Loader2, ArrowRight, ArrowLeft, User, BarChart3, Users, Target, Building, MessageSquare, Music } from 'lucide-react';
import slugify from 'slugify';
import AudioWaveformPreview from './AudioWaveformPreview';
import WaveSurfer from 'wavesurfer.js';

const steps = [
  { id: 'intro', title: 'Welcome', icon: MessageSquare },
  { id: 'basic', title: 'Basic Info', icon: User },
  { id: 'stats', title: 'Statistics', icon: BarChart3 },
  { id: 'community', title: 'Community', icon: Users },
  { id: 'priorities', title: 'Priorities', icon: Target },
  { id: 'project', title: 'Local Project', icon: Building },
  { id: 'music', title: 'Music', icon: Music },
  { id: 'quote', title: 'Slogan', icon: MessageSquare },
];

export function MPWrappedForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<MPWrapped>({
    mpName: '',
    constituency: '',
    musicSelect: 1,
    surgeryHours: 0,
    casesClosed: 0,
    parliamentContributions: 0,
    parliamentVotes: 0,
    communityVisits: {
      totalEngagements: 0,
      category1: { number: 0, label: '' },
      category2: { number: 0, label: '' },
      category3: { number: 0, label: '' }
    },
    contributionPriorities: ['', '', ''],
    votePriorities: ['', '', ''],
    localProject: {
      name: '',
      achievement: ''
    },
    quote: ''
  });

  // Surgery calculation state
  const [surgeryData, setSurgeryData] = useState({
    numberOfSurgeries: '',
    averageSurgeryLength: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [activeSong, setActiveSong] = useState<number | null>(null);
  const [playingWave, setPlayingWave] = useState<WaveSurfer | null>(null);
  const [progress, setProgress] = useState(0);

  // Progress bar logic – count up to 100% over 10 seconds while submitting
  useEffect(() => {
    if (isSubmitting) {
      setProgress(0);
      const start = Date.now();
      const timer = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, (elapsed / 10000) * 100);
        setProgress(pct);
      }, 100);
      return () => clearInterval(timer);
    } else {
      setProgress(0);
    }
  }, [isSubmitting]);

  const updateField = (path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const updateSurgeryData = (field: 'numberOfSurgeries' | 'averageSurgeryLength', value: string) => {
    setSurgeryData(prev => {
      const newData = { ...prev, [field]: value };
      // Calculate total surgery hours
      const numSurgeries = parseInt(newData.numberOfSurgeries) || 0;
      const avgLength = parseInt(newData.averageSurgeryLength) || 0;
      const totalHours = numSurgeries * avgLength;
      updateField('surgeryHours', totalHours);
      return newData;
    });
  };

  const updateArrayField = (field: 'contributionPriorities' | 'votePriorities', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const validateCurrentStep = () => {
    const stepValidations = {
      0: () => true, // Welcome page always valid
      1: () => formData.mpName.length >= 2 && formData.constituency.length >= 1,
      2: () => true, // Stats can be 0
      3: () => formData.communityVisits.category1.label && formData.communityVisits.category2.label && formData.communityVisits.category3.label,
      4: () => formData.contributionPriorities.every(p => p.length > 0) && formData.votePriorities.every(p => p.length > 0),
      5: () => formData.localProject.name.length > 0 && formData.localProject.achievement.length > 0,
      6: () => formData.musicSelect >= 1 && formData.musicSelect <= 8,
      7: () => formData.quote.length > 0 && formData.quote.length <= 40,
    };

    return stepValidations[currentStep as keyof typeof stepValidations]?.() || false;
  };

  const validateForm = () => {
    try {
      mpWrappedSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const newErrors: Record<string, string> = {};
      error.errors.forEach((err: any) => {
        const path = err.path.join('.');
        newErrors[path] = err.message;
      });
      setErrors(newErrors);
      return false;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
    if (playingWave) {
      playingWave.pause();
      playingWave.seekTo(0);
    }
    setActiveSong(null);
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
    if (playingWave) {
      playingWave.pause();
      playingWave.seekTo(0);
    }
    setActiveSong(null);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // Deep trim all string fields in formData
    function deepTrim(obj: any): any {
      if (typeof obj === 'string') return obj.trim();
      if (Array.isArray(obj)) return obj.map(deepTrim);
      if (typeof obj === 'object' && obj !== null) {
        const trimmedObj: any = {};
        for (const key in obj) {
          trimmedObj[key] = deepTrim(obj[key]);
        }
        return trimmedObj;
      }
      return obj;
    }
    const trimmedFormData = deepTrim(formData);

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/.netlify/functions/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trimmedFormData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      const slug = slugify(trimmedFormData.mpName, { lower: true, strict: true });
      setSubmitStatus('success');
      setSubmitMessage(`Successfully published! Redirecting to wrapped.allhandsontech.uk/${slug}`);
      
      setTimeout(() => {
        window.location.assign(`https://wrapped.allhandsontech.uk/${slug}`);
      }, 2000);

    } catch (error: any) {
      setSubmitStatus('error');
      setSubmitMessage(error.message || 'Failed to publish. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <MessageSquare className="w-16 h-16 text-[#DA2650] mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-6">Thanks for using our Labour Spotify Wrapped tool!</h2>
            </div>
            <div className="max-w-3xl mx-auto bg-gray-900 p-8 rounded-xl">
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  By entering your key local achievements using the prompts in the form below, you can generate an engaging Wrapped-style video that highlights your impact across the constituency in your first year.
                </p>
                <p>
                  👉 See an example of what your video could look like{' '}
                  <a 
                    href="https://wrapped.allhandsontech.uk/kanishka-narayan" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#DA2650] hover:text-[#DA2650]/80 underline transition-colours"
                  >
                    here
                  </a>
                  .
                </p>
                <p>
                  If you'd like a video export to share on social media, just email{' '}
                  <a 
                    href="mailto:tom.blake@parliament.uk" 
                    className="text-[#DA2650] hover:text-[#DA2650]/80 underline transition-colors"
                  >
                    tom.blake@parliament.uk
                  </a>
                  {' '}with the link to your Wrapped.
                </p>
                <p>
                  For any questions or technical issues, feel free to get in touch with Tom directly.
                </p>
                <p className="text-[#DA2650] font-bold pt-2">
                  Team Kanishka Narayan MP :)
                </p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <User className="w-16 h-16 text-[#DA2650] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Let's start with the basics</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">MP Name</label>
                <input
                  type="text"
                  value={formData.mpName}
                  onChange={(e) => updateField('mpName', e.target.value)}
                  className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200"
                  placeholder="e.g. Kanishka Narayan"
                />
                {errors.mpName && <p className="text-[#DA2650] text-sm mt-1">{errors.mpName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Constituency</label>
                <input
                  type="text"
                  value={formData.constituency}
                  onChange={(e) => updateField('constituency', e.target.value)}
                  className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200"
                  placeholder="e.g. the Vale of Glamorgan"
                />
                {errors.constituency && <p className="text-[#DA2650] text-sm mt-1">{errors.constituency}</p>}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <BarChart3 className="w-16 h-16 text-[#DA2650] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Casework Statistics</h2>
            </div>
            <div className="space-y-6">
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Surgery Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Number of Surgeries</label>
                    <input
                      type="number"
                      min="0"
                      value={surgeryData.numberOfSurgeries}
                      onChange={(e) => updateSurgeryData('numberOfSurgeries', e.target.value)}
                      className="w-full p-4 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200"
                      placeholder="e.g. 52"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Average Surgery Length (hours)</label>
                    <input
                      type="number"
                      min="0"
                      value={surgeryData.averageSurgeryLength}
                      onChange={(e) => updateSurgeryData('averageSurgeryLength', e.target.value)}
                      className="w-full p-4 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200"
                      placeholder="e.g. 3"
                    />
                  </div>
                </div>
                <div className="mt-4 p-4 bg-[#DA2650]/10 border border-[#DA2650]/30 rounded-lg">
                  <p className="text-[#DA2650] font-medium">
                    Total Surgery Hours: {formData.surgeryHours} hours
                  </p>
                </div>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-2">Cases Closed</label>
                <input
                  type="number"
                  min="0"
                  value={formData.casesClosed || ''}
                  onChange={(e) => updateField('casesClosed', parseInt(e.target.value) || 0)}
                  className="w-full p-4 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200"
                  placeholder="Enter number of cases closed"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <Users className="w-16 h-16 text-[#DA2650] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Community Engagement</h2>
            </div>
            <div className="mb-8">
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-2">Total Community Engagements</label>
                <input
                  type="number"
                  min="0"
                  value={formData.communityVisits.totalEngagements || ''}
                  onChange={(e) => updateField('communityVisits.totalEngagements', parseInt(e.target.value) || 0)}
                  className="w-full p-4 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200"
                  placeholder="e.g. 150"
                />
                {errors['communityVisits.totalEngagements'] && <p className="text-[#DA2650] text-sm mt-1">{errors['communityVisits.totalEngagements']}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['category1', 'category2', 'category3'] as const).map((category, index) => {
                const placeholders = ['e.g. Businesses', 'e.g. Classrooms', 'e.g. Community Events'];
                return (
                  <div key={category} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Category {index + 1}</h3>
                    <div className="space-y-4">
                      <div>
                        <input
                          type="text"
                          value={formData.communityVisits[category].label}
                          onChange={(e) => updateField(`communityVisits.${category}.label`, e.target.value)}
                          className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200"
                          placeholder={placeholders[index]}
                          maxLength={25}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <Target className="w-16 h-16 text-[#DA2650] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Parliamentary Priorities</h2>
            </div>
            <div className="space-y-8">
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-5 h-5 text-[#DA2650]" />
                  <h3 className="text-lg font-semibold text-white">Parliament Contributions</h3>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Total Contributions</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.parliamentContributions || ''}
                    onChange={(e) => updateField('parliamentContributions', parseInt(e.target.value) || 0)}
                    className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200"
                    placeholder="Enter number of contributions"
                  />
                  <p className="text-sm text-gray-400 mt-2">We suggested including written questions</p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Top 3 Priorities</h4>
                  {formData.contributionPriorities.map((priority, index) => (
                    <div key={index}>
                      <input
                        type="text"
                        value={priority}
                        onChange={(e) => updateArrayField('contributionPriorities', index, e.target.value)}
                        className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200"
                        placeholder={`Contribution Priority ${index + 1}`}
                        maxLength={40}
                      />
                      {priority.length >= 30 && (
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-gray-400">{priority.length}/40 characters</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-5 h-5 text-[#DA2650]" />
                  <h3 className="text-lg font-semibold text-white">Parliament Votes</h3>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Total Votes</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.parliamentVotes || ''}
                    onChange={(e) => updateField('parliamentVotes', parseInt(e.target.value) || 0)}
                    className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200"
                    placeholder="Enter number of votes"
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    You can find this <a href="https://members.parliament.uk/members/commons" target="_blank" rel="noopener noreferrer" className="underline text-[#DA2650]">here</a>
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Top 3 Election Promises</h4>
                  {formData.votePriorities.map((priority, index) => (
                    <div key={index}>
                      <input
                        type="text"
                        value={priority}
                        onChange={(e) => updateArrayField('votePriorities', index, e.target.value)}
                        className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200"
                        placeholder={`Vote Priority ${index + 1}`}
                        maxLength={60}
                      />
                      {priority.length >= 50 && (
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-gray-400">{priority.length}/60 characters</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-400 mb-2">
                  We suggest looking <a href="https://fullfact.org/government-tracker/?utm_source=chatgpt.com" target="_blank" rel="noopener noreferrer" className="underline text-[#DA2650]">here</a>
                </p>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <Building className="w-16 h-16 text-[#DA2650] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Local Impact</h2>
            </div>
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
                <input
                  type="text"
                  value={formData.localProject.name}
                  onChange={(e) => updateField('localProject.name', e.target.value)}
                  className="w-full p-4 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200"
                  placeholder="e.g. Youth Center Renovation"
                  maxLength={30}
                />
                {formData.localProject.name.length >= 25 && (
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-gray-400">{formData.localProject.name.length}/30 characters</p>
                  </div>
                )}
                {errors['localProject.name'] && <p className="text-[#DA2650] text-sm mt-1">{errors['localProject.name']}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Achievement Description</label>
                <textarea
                  value={formData.localProject.achievement}
                  onChange={(e) => updateField('localProject.achievement', e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Describe the achievement and its impact on your constituency..."
                  maxLength={150}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm text-gray-400">{formData.localProject.achievement.length}/150 characters</p>
                  {errors['localProject.achievement'] && <p className="text-[#DA2650] text-sm">{errors['localProject.achievement']}</p>}
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <Music className="w-16 h-16 text-[#DA2650] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Choose Your Music</h2>
              <p className="text-sm text-gray-400 mt-2">We have licensed this music on your behalf.</p>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {[1,2,3,4,5,6,7,8].map((songNumber) => (
                  <div
                    key={songNumber}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      formData.musicSelect === songNumber
                        ? 'border-[#DA2650] bg-[#DA2650]/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                    onClick={() => updateField('musicSelect', songNumber)}
                  >
                    <div className="text-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        formData.musicSelect === songNumber
                          ? 'bg-[#DA2650] text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        <Music size={24} />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Song {songNumber}</h3>
                      <AudioWaveformPreview
                        src={`/${songNumber}.mp3`}
                        isActive={activeSong === songNumber}
                        onPlay={(wave) => {
                          if (playingWave && playingWave !== wave) {
                            playingWave.pause();
                            playingWave.seekTo(0);
                          }
                          setPlayingWave(wave);
                          setActiveSong(songNumber);
                          wave.play();
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <MessageSquare className="w-16 h-16 text-[#DA2650] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Final Touch</h2>
            </div>
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Slogan</label>
              <textarea
                value={formData.quote}
                onChange={(e) => updateField('quote', e.target.value)}
                rows={2}
                maxLength={40}
                className="w-full p-4 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#DA2650] focus:border-transparent transition-all duration-200 resize-none"
                placeholder="e.g. Delivering for the Vale!"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-400">{formData.quote.length}/40 characters</p>
                {errors.quote && <p className="text-[#DA2650] text-sm">{errors.quote.replace('Quote', 'Campaign Slogan')}</p>}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">MP Wrapped Creator</h1>
          <div className="w-24 h-1 bg-[#DA2650] mx-auto rounded-full"></div>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive ? 'bg-[#DA2650] text-white scale-110' :
                    isCompleted ? 'bg-[#DA2650]/20 text-[#DA2650]' :
                    'bg-gray-800 text-gray-500'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <span className={`text-xs mt-2 transition-colors duration-300 ${
                    isActive ? 'text-[#DA2650] font-medium' :
                    isCompleted ? 'text-gray-400' :
                    'text-gray-600'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className="bg-[#DA2650] h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-12">
          {renderStepContent()}
        </div>

        {/* Submit Status */}
        {submitStatus !== 'idle' && (
          <div className={`p-4 rounded-xl flex items-center gap-3 mb-8 animate-fadeIn ${
            submitStatus === 'success' ? 'bg-green-900/30 border border-green-700 text-green-300' : 
            'bg-red-900/30 border border-red-700 text-red-300'
          }`}>
            {submitStatus === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{submitMessage}</span>
          </div>
        )}

        {/* Progress Bar while submitting */}
        {isSubmitting && (
          <div className="w-full bg-gray-700 rounded-full h-2 mb-8 overflow-hidden">
            <div
              className="bg-[#DA2650] h-2"
              style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
            />
          </div>
        )}

        {/* Notes before Create URL – only on final step */}
        {currentStep === steps.length - 1 && (
          <>
            <p className="text-sm text-gray-400 mb-4 max-w-xl">
              If you'd like a video export to share on social media, just email <a href="mailto:tom.blake@parliament.uk" className="underline text-[#DA2650]">tom.blake@parliament.uk</a> with the link to your Wrapped.
            </p>
            <p className="text-sm text-gray-400 mb-6 max-w-xl">
              Please note: it may take around 10&nbsp;seconds for the URL to load after clicking the button.
            </p>
          </>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ArrowLeft size={20} />
            Previous
          </button>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !validateCurrentStep()}
              className="flex items-center gap-2 px-8 py-3 bg-[#DA2650] text-white rounded-xl hover:bg-[#DA2650]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              {isSubmitting && <Loader2 size={20} className="animate-spin" />}
              {isSubmitting ? 'Creating...' : 'Create URL'}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!validateCurrentStep()}
              className="flex items-center gap-2 px-6 py-3 bg-[#DA2650] text-white rounded-xl hover:bg-[#DA2650]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Next
              <ArrowRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}