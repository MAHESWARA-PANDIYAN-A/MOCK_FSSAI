import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Check, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Upload, 
  Trash2, 
  Plus, 
  Download, 
  CheckCircle2,
  Lock,
  RefreshCw,
  Eye
} from 'lucide-react';
import apiClient from '../services/api';
import { 
  Application, 
  DocumentRequirement, 
  FoodProductInfo, 
  ApiResponse,
  OwnershipType 
} from '../types';
import { Stepper, DEFAULT_WIZARD_STEPS } from '../components/common/Stepper';
import { DocumentStatusBadge } from '../components/common/DocumentStatusBadge';

const SIMPLE_FOOD_ACTIVITIES = [
  { id: 'MANUFACTURING', label: 'Manufacturing / Processing' },
  { id: 'PACKAGING', label: 'Packaging & Storage' },
  { id: 'RETAIL', label: 'Retail & Food Stall' },
  { id: 'RESTAURANT', label: 'Restaurant / Catering' },
  { id: 'WHOLESALE', label: 'Wholesale / Distribution' },
  { id: 'OTHER', label: 'Other Food Operations' }
];

export const NewApplicationWizard: React.FC = () => {
  const { appNumber } = useParams<{ appNumber: string }>();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [application, setApplication] = useState<Application | null>(null);
  const [docRequirements, setDocRequirements] = useState<DocumentRequirement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Essential Form States
  const [applicantName, setApplicantName] = useState<string>('');
  const [designation, setDesignation] = useState<string>('Managing Director');
  const [mobile, setMobile] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  const [businessName, setBusinessName] = useState<string>('ABC Foods Pvt Ltd');
  const [orgType, setOrgType] = useState<string>('PRIVATE_LIMITED');
  const [bizType, setBizType] = useState<string>('MANUFACTURING_UNIT');
  const [pan, setPan] = useState<string>('AABCA1234F');
  const [gst, setGst] = useState<string>('33AABCA1234F1Z5');

  const [selectedActivities, setSelectedActivities] = useState<string[]>(['MANUFACTURING']);

  const [ownershipType, setOwnershipType] = useState<OwnershipType>('OWNED');
  const [address1, setAddress1] = useState<string>('Plot 42, SIDCO Industrial Estate, Omalur Road');
  const [address2, setAddress2] = useState<string>('Phase II');
  const [state, setState] = useState<string>('Tamil Nadu');
  const [district, setDistrict] = useState<string>('Salem');
  const [pincode, setPincode] = useState<string>('636001');

  const [products, setProducts] = useState<FoodProductInfo[]>([
    {
      product_name: 'Masala Potato Chips',
      product_category: 'Packaged Snack Foods',
      expected_capacity: 1000,
      unit_of_measure: 'kg/day'
    }
  ]);

  // Document upload state
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  // OTP state
  const [enteredOtp, setEnteredOtp] = useState<string>('123456');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load application and requirements
  useEffect(() => {
    if (appNumber) {
      loadApplicationData();
    }
  }, [appNumber]);

  const loadApplicationData = async () => {
    setIsLoading(true);
    try {
      const [appRes, reqRes] = await Promise.all([
        apiClient.get<ApiResponse<Application>>(`/applicant/applications/${appNumber}`),
        apiClient.get<ApiResponse<DocumentRequirement[]>>('/documents/requirements')
      ]);

      if (appRes.data.success) {
        const app = appRes.data.data;
        setApplication(app);

        // Populate essential fields
        if (app.applicant) {
          setApplicantName(app.applicant.applicant_name);
          setDesignation(app.applicant.designation || 'Authorized Signatory');
          setMobile(app.applicant.mobile);
          setEmail(app.applicant.email);
        }
        if (app.business) {
          setBusinessName(app.business.business_name);
          setOrgType(app.business.organization_type || 'PRIVATE_LIMITED');
          setBizType(app.business.business_type || 'MANUFACTURING_UNIT');
          setState(app.business.state || 'Tamil Nadu');
          setDistrict(app.business.district || 'Salem');
          setPincode(app.business.pincode || '636001');
          setAddress1(app.business.address_line_1 || '');
          setAddress2(app.business.address_line_2 || '');
          setGst(app.business.gst_number || '');
          setPan(app.business.pan_number || '');
        }
        if (app.activities && app.activities.length > 0) {
          setSelectedActivities(app.activities);
        }
        if (app.premises) {
          setOwnershipType(app.premises.ownership_type);
          if (app.premises.address_line_1) setAddress1(app.premises.address_line_1);
          if (app.premises.address_line_2) setAddress2(app.premises.address_line_2);
          if (app.premises.state) setState(app.premises.state);
          if (app.premises.district) setDistrict(app.premises.district);
          if (app.premises.pincode) setPincode(app.premises.pincode);
        }
        if (app.products && app.products.length > 0) {
          setProducts(app.products);
        }
      }

      if (reqRes.data.success) {
        setDocRequirements(reqRes.data.data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load application data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async (silent: boolean = false) => {
    if (!application) return;
    if (!silent) setIsSaving(true);
    setErrorMessage(null);

    const payload = {
      applicant: {
        applicant_name: applicantName,
        designation: designation,
        mobile: mobile,
        email: email
      },
      business: {
        business_name: businessName,
        legal_name: businessName,
        organization_type: orgType,
        business_type: bizType,
        project_stage: 'NEW',
        state: state,
        district: district,
        pincode: pincode,
        address_line_1: address1,
        address_line_2: address2,
        investment_amount: 5000000,
        employee_count: 10,
        gst_number: gst,
        pan_number: pan
      },
      activities: selectedActivities.length > 0 ? selectedActivities : ['MANUFACTURING'],
      premises: {
        ownership_type: ownershipType,
        address_line_1: address1,
        address_line_2: address2,
        state: state,
        district: district,
        pincode: pincode
      },
      products: products.map(p => ({
        ...p,
        ingredients: p.ingredients || 'Standard food ingredients as per FSSAI regulations',
        manufacturing_process_description: p.manufacturing_process_description || 'Standard hygienic food preparation and packaging'
      })),
      installed_capacity_details: 'Standard commercial processing capacity',
      machinery_details: 'Standard food-grade processing and packaging equipment'
    };

    try {
      const res = await apiClient.put<ApiResponse<Application>>(
        `/applicant/applications/${application.application_number}`,
        payload
      );
      if (res.data.success) {
        setApplication(res.data.data);
        if (!silent) {
          setSuccessMessage('Draft saved successfully.');
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save application draft.');
    } finally {
      if (!silent) setIsSaving(false);
    }
  };

  const handleNextStep = async () => {
    await handleSaveDraft(true);
    if (currentStep < 9) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddProduct = () => {
    setProducts([
      ...products,
      {
        product_name: '',
        product_category: 'Packaged Snack Foods',
        expected_capacity: 500,
        unit_of_measure: 'kg/day'
      }
    ]);
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: keyof FoodProductInfo, value: any) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  };

  const handleFileUpload = async (requirementId: string, file: File) => {
    if (!application) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(`File '${file.name}' exceeds the 5 MB maximum size limit.`);
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      setErrorMessage(`Invalid file format '.${ext}'. Allowed formats: PDF, JPG, JPEG, PNG.`);
      return;
    }

    setUploadingDocId(requirementId);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('requirement_id', requirementId);
    formData.append('file', file);

    try {
      const res = await apiClient.post(
        `/documents/upload/${application.application_number}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      if (res.data.success) {
        setSuccessMessage(`Document '${file.name}' uploaded successfully.`);
        setTimeout(() => setSuccessMessage(null), 3000);
        await loadApplicationData();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || err.message || 'Upload failed.');
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to remove this uploaded document?')) return;

    try {
      const res = await apiClient.delete(`/documents/${documentId}`);
      if (res.data.success) {
        setSuccessMessage('Document removed successfully.');
        setTimeout(() => setSuccessMessage(null), 3000);
        await loadApplicationData();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || err.message || 'Failed to remove document.');
    }
  };

  const handleSendOtp = async () => {
    if (!application) return;
    try {
      const res = await apiClient.post(`/applicant/applications/${application.application_number}/send-otp`);
      if (res.data.success) {
        setSuccessMessage('OTP dispatched to your registered mobile and email.');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification OTP.');
    }
  };

  const handleSubmitApplication = async () => {
    if (!application) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.post(
        `/applicant/applications/${application.application_number}/submit`,
        { otp_code: enteredOtp }
      );

      if (res.data.success) {
        setApplication(res.data.data);
        setCurrentStep(9);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      const errObj = err.response?.data?.error;
      if (errObj?.missing_documents && errObj.missing_documents.length > 0) {
        setErrorMessage(`Please upload all 4 required documents: ${errObj.missing_documents.join(', ')}`);
      } else {
        setErrorMessage(errObj?.message || err.message || 'Application submission failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gov-700 mb-2" />
        Loading application wizard...
      </div>
    );
  }

  // Count uploaded documents (out of 4)
  const uploadedDocsCount = docRequirements.filter((req) =>
    application?.documents?.some((d) => d.requirement_id === req.id && d.review_status !== 'REJECTED')
  ).length;
  const totalRequiredDocs = docRequirements.length || 4;
  const remainingDocsCount = Math.max(0, totalRequiredDocs - uploadedDocsCount);
  const progressPercent = Math.round((uploadedDocsCount / totalRequiredDocs) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Banner with Application Number */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">
              Food Safety License Application
            </h1>
            <span className="text-xs font-mono font-bold bg-gov-100 text-gov-800 px-2 py-0.5 rounded border border-gov-200">
              {application?.application_number}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Step {currentStep} of 9 — {DEFAULT_WIZARD_STEPS[currentStep - 1]}
          </p>
        </div>

        {currentStep < 9 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSaveDraft(false)}
              disabled={isSaving}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Stepper */}
      <Stepper
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step < currentStep) {
            handleSaveDraft(true);
            setCurrentStep(step);
          }
        }}
      />

      {/* Alerts */}
      {errorMessage && (
        <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Step Content Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 mb-6">
        {/* STEP 1: APPLICANT DETAILS */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800">Step 1 — Applicant Information</h2>
              <p className="text-xs text-slate-500">Provide official contact details of the applicant.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation *</label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Mobile Number *</label>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    ✓ Verified
                  </span>
                </div>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Email Address *</label>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    ✓ Verified
                  </span>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: BUSINESS DETAILS */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800">Step 2 — Business & Entity Details</h2>
              <p className="text-xs text-slate-500">Provide basic business identity and registration details.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. ABC Foods Pvt Ltd"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Organization Type *</label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-gov-700 focus:outline-none"
                >
                  <option value="PRIVATE_LIMITED">Private Limited Company</option>
                  <option value="PUBLIC_LIMITED">Public Limited Company</option>
                  <option value="LLP">Limited Liability Partnership (LLP)</option>
                  <option value="PARTNERSHIP">Partnership Firm</option>
                  <option value="PROPRIETORSHIP">Proprietorship</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Category *</label>
                <select
                  value={bizType}
                  onChange={(e) => setBizType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-gov-700 focus:outline-none"
                >
                  <option value="MANUFACTURING_UNIT">Food Manufacturing / Processing</option>
                  <option value="RESTAURANT">Restaurant / Food Service</option>
                  <option value="RETAIL">Retail / Supermarket</option>
                  <option value="WAREHOUSE">Storage / Warehouse</option>
                  <option value="DISTRIBUTOR">Distributor / Wholesaler</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PAN Number *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder="AABCA1234F"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GST Number (Optional)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={gst}
                  onChange={(e) => setGst(e.target.value.toUpperCase())}
                  placeholder="33AABCA1234F1Z5"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: FOOD BUSINESS ACTIVITY */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800">Step 3 — Primary Food Business Activities</h2>
              <p className="text-xs text-slate-500">Select the operations conducted at this facility.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {SIMPLE_FOOD_ACTIVITIES.map((act) => {
                const isChecked = selectedActivities.includes(act.id);
                return (
                  <label
                    key={act.id}
                    className={`flex items-center space-x-2.5 p-3.5 rounded-lg border text-xs cursor-pointer transition ${
                      isChecked
                        ? 'bg-gov-50 border-gov-500 text-gov-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedActivities([...selectedActivities, act.id]);
                        } else {
                          setSelectedActivities(selectedActivities.filter((id) => id !== act.id));
                        }
                      }}
                      className="rounded text-gov-700 focus:ring-gov-700"
                    />
                    <span>{act.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: PREMISES ADDRESS */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800">Step 4 — Business Premises Address</h2>
              <p className="text-xs text-slate-500">Address where the food unit or kitchen is located.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Premises Ownership *</label>
                <select
                  value={ownershipType}
                  onChange={(e) => setOwnershipType(e.target.value as OwnershipType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-gov-700 focus:outline-none"
                >
                  <option value="OWNED">Owned</option>
                  <option value="RENTED">Rented</option>
                  <option value="LEASED">Leased</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  required
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="Plot/Shop No., Building Name, Street"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Area / Industrial Estate</label>
                <input
                  type="text"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="Phase, Sector, Area"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">District *</label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pincode *</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="636001"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: FOOD PRODUCTS */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-800">Step 5 — Food Products & Categories</h2>
                <p className="text-xs text-slate-500">Add the main food items prepared or sold.</p>
              </div>
              <button
                type="button"
                onClick={handleAddProduct}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gov-800 hover:bg-gov-700 text-white font-semibold rounded text-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="space-y-3">
              {products.map((p, idx) => (
                <div key={idx} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-gov-800">Product #{idx + 1}</span>
                    {products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(idx)}
                        className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                      <input
                        type="text"
                        required
                        value={p.product_name}
                        onChange={(e) => handleProductChange(idx, 'product_name', e.target.value)}
                        placeholder="e.g. Masala Potato Chips, Bakery Cookies"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white focus:ring-2 focus:ring-gov-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Food Category *</label>
                      <input
                        type="text"
                        required
                        value={p.product_category}
                        onChange={(e) => handleProductChange(idx, 'product_category', e.target.value)}
                        placeholder="e.g. Packaged Snacks, Bakery, Dairy, Beverages"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white focus:ring-2 focus:ring-gov-700 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6: SIMPLIFIED 4-DOCUMENT CENTER */}
        {currentStep === 6 && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800">Step 6 — Mandatory Document Checklist (4 Required)</h2>
              <p className="text-xs text-slate-500">
                Upload the 4 statutory documents (PDF, JPG, JPEG, PNG &le; 5MB).
              </p>
            </div>

            {/* Document Progress Indicator Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-800">Document Progress</span>
                <span className="text-gov-800 font-mono">
                  {uploadedDocsCount} / {totalRequiredDocs} Uploaded ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    uploadedDocsCount === totalRequiredDocs ? 'bg-emerald-600' : 'bg-gov-700'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>
                  {remainingDocsCount === 0
                    ? '✓ All 4 required documents uploaded'
                    : `${remainingDocsCount} document${remainingDocsCount > 1 ? 's' : ''} remaining`}
                </span>
                <span className="text-slate-400">Max file size: 5 MB each</span>
              </div>
            </div>

            {/* Card-Based Clean Document Upload Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {docRequirements.map((req) => {
                const uploadedDoc = application?.documents?.find((d) => d.requirement_id === req.id);
                const isUploading = uploadingDocId === req.id;
                const isUploaded = !!uploadedDoc;

                return (
                  <div
                    key={req.id}
                    className={`p-5 rounded-xl border transition flex flex-col justify-between ${
                      isUploaded
                        ? 'bg-slate-50/60 border-slate-300'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-bold text-sm text-slate-900">{req.name}</h3>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          Required: Yes
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-3">
                        {req.description}
                      </p>

                      <div className="flex items-center space-x-2 text-xs mb-3">
                        <span className="text-slate-500">Status:</span>
                        {uploadedDoc ? (
                          <DocumentStatusBadge status={uploadedDoc.review_status} />
                        ) : (
                          <DocumentStatusBadge status="NOT_UPLOADED" />
                        )}
                      </div>

                      {uploadedDoc && (
                        <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1 mb-3">
                          <div className="font-semibold text-slate-800 flex items-center space-x-1.5 truncate">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{uploadedDoc.original_filename}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Size: {(uploadedDoc.file_size / 1024).toFixed(1)} KB &bull; Uploaded: {new Date(uploadedDoc.uploaded_at).toLocaleDateString('en-GB')}
                          </div>
                          {uploadedDoc.officer_comment && (
                            <div className="text-[11px] text-rose-700 font-semibold pt-1 border-t border-slate-100">
                              Officer Comment: {uploadedDoc.officer_comment}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      {isUploaded ? (
                        <div className="flex items-center space-x-2 w-full justify-between">
                          <a
                            href={`/api/v1/documents/view/${uploadedDoc?.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-xs font-bold text-gov-700 hover:text-gov-900 px-2.5 py-1 rounded hover:bg-slate-100 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </a>

                          <div className="flex items-center space-x-2">
                            <label className="cursor-pointer inline-flex items-center space-x-1 px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold shadow-sm transition">
                              <Upload className="w-3 h-3" />
                              <span>{isUploading ? 'Uploading...' : 'Replace'}</span>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                disabled={isUploading}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileUpload(req.id, e.target.files[0]);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => uploadedDoc && handleDeleteDocument(uploadedDoc.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Remove File"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-gov-800 hover:bg-gov-700 text-white rounded-lg text-xs font-bold shadow-sm transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploading ? 'Uploading...' : 'Upload Document'}</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            disabled={isUploading}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileUpload(req.id, e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 7: REVIEW */}
        {currentStep === 7 && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Step 7 — Application Summary</h2>
                <p className="text-xs text-slate-500">Verify your details before final submission.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-gov-100 text-gov-800 rounded">
                Checklist Ready
              </span>
            </div>

            {/* Document Checklist & Missing Warning */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider">Document Checklist (4 Required)</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {docRequirements.map((req) => {
                  const isUploaded = application?.documents?.some(
                    (d) => d.requirement_id === req.id && d.review_status !== 'REJECTED'
                  );
                  return (
                    <div
                      key={req.id}
                      className={`flex items-center space-x-2 p-2.5 rounded-lg border ${
                        isUploaded
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800 font-semibold'
                          : 'bg-rose-50/60 border-rose-200 text-rose-800 font-semibold'
                      }`}
                    >
                      {isUploaded ? (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{req.name}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-200">
                {uploadedDocsCount === totalRequiredDocs ? (
                  <div className="text-emerald-700 font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>All 4 required documents are uploaded.</span>
                  </div>
                ) : (
                  <div className="text-rose-700 font-bold flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      {remainingDocsCount} required document{remainingDocsCount > 1 ? 's are' : ' is'} still missing.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Details Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gov-800">Applicant Details</span>
                  <button onClick={() => setCurrentStep(1)} className="text-gov-700 font-bold underline">Edit</button>
                </div>
                <p><strong>Name:</strong> {applicantName} ({designation})</p>
                <p><strong>Mobile:</strong> {mobile}</p>
                <p><strong>Email:</strong> {email}</p>
              </div>

              <div className="p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gov-800">Business & Premises</span>
                  <button onClick={() => setCurrentStep(2)} className="text-gov-700 font-bold underline">Edit</button>
                </div>
                <p><strong>Entity:</strong> {businessName} ({orgType})</p>
                <p><strong>Location:</strong> {address1}, {district}, {state} - {pincode}</p>
                <p><strong>PAN:</strong> {pan || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: OTP VERIFICATION */}
        {currentStep === 8 && (
          <div className="space-y-6 max-w-lg mx-auto py-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-gov-100 text-gov-800 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Step 8 — Mobile & Email OTP Authorization</h2>
              <p className="text-xs text-slate-500">
                A verification code has been dispatched to {mobile} and {email}.
              </p>
            </div>

            {/* Development OTP Banner */}
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-center justify-between font-medium">
              <span>Demo OTP Code: <strong>123456</strong></span>
              <button
                type="button"
                onClick={handleSendOtp}
                className="font-bold underline text-gov-700 hover:text-gov-900"
              >
                Resend OTP
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                placeholder="123456"
                className="w-48 mx-auto block text-center tracking-widest text-lg font-mono font-bold px-3 py-2 border-2 border-gov-700 rounded focus:outline-none"
              />
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleSubmitApplication}
                disabled={isSubmitting || enteredOtp.length < 6 || uploadedDocsCount < totalRequiredDocs}
                className="px-8 py-3 bg-saffron-500 hover:bg-saffron-600 text-slate-950 font-bold rounded-lg shadow-md text-sm transition disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting Application...' : 'Verify OTP & Submit Application'}
              </button>
              {uploadedDocsCount < totalRequiredDocs && (
                <p className="text-xs text-rose-600 font-bold mt-2">
                  Please upload all 4 required documents before submitting.
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 9: SUBMISSION SUCCESS & ACKNOWLEDGEMENT */}
        {currentStep === 9 && (
          <div className="text-center space-y-6 py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Application Submitted Successfully!</h2>
              <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                Your application and 4 statutory documents have been submitted to the scrutiny queue for FSSAI Officer review.
              </p>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl max-w-md mx-auto space-y-2 text-xs text-left">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Application Number:</span>
                <span className="font-bold text-gov-800 text-sm font-mono">{application?.application_number}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Business:</span>
                <span className="font-bold text-slate-800">{businessName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold text-blue-700">SUBMITTED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Submission Timestamp:</span>
                <span className="font-semibold text-slate-700">{new Date().toLocaleString('en-GB')}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href={`/api/v1/applicant/applications/${application?.application_number}/acknowledgement`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-gov-800 hover:bg-gov-700 text-white font-bold px-6 py-2.5 rounded-lg shadow text-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Acknowledgement PDF</span>
              </a>

              <Link
                to={`/applicant/applications/${application?.application_number}`}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-2.5 rounded-lg text-xs transition shadow-sm"
              >
                <span>Track Application Progress</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Step Navigation Bar */}
      {currentStep < 9 && (
        <div className="flex items-center justify-between bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className="inline-flex items-center space-x-1.5 px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-medium text-slate-500">
            Step {currentStep} of 9
          </span>

          <button
            type="button"
            onClick={handleNextStep}
            className="inline-flex items-center space-x-1.5 px-6 py-2 bg-gov-800 hover:bg-gov-700 text-white rounded text-xs font-bold shadow-sm transition"
          >
            <span>{currentStep === 7 ? 'Proceed to OTP Verification' : 'Next Step'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
