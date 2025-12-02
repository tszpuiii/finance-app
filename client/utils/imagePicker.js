import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export async function requestCameraPermission() {
	const { status } = await ImagePicker.requestCameraPermissionsAsync();
	if (status !== 'granted') {
		Alert.alert(
			'Permission Required',
			'Sorry, we need camera permissions to take photos of receipts!'
		);
		return false;
	}
	return true;
}

export async function requestMediaLibraryPermission() {
	const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
	if (status !== 'granted') {
		Alert.alert(
			'Permission Required',
			'Sorry, we need media library permissions to select photos!'
		);
		return false;
	}
	return true;
}

export async function pickImageFromCamera() {
	const hasPermission = await requestCameraPermission();
	if (!hasPermission) return null;

	try {
		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [4, 3],
			quality: 0.4, // 進一步降低質量以減少文件大小（0.4 = 40%）
			base64: true,
			allowsMultipleSelection: false,
		});

		if (!result.canceled && result.assets && result.assets.length > 0) {
			const asset = result.assets[0];
			// 檢查 base64 大小
			if (asset.base64) {
				const sizeInMB = asset.base64.length / (1024 * 1024);
				console.log('Image base64 size:', sizeInMB.toFixed(2), 'MB');
				if (sizeInMB > 3) {
					console.warn('Image is large, consider reducing quality further');
				}
			}
			return {
				uri: asset.uri,
				base64: asset.base64,
				width: asset.width,
				height: asset.height,
			};
		}
		return null;
	} catch (error) {
		console.error('Error picking image from camera:', error);
		Alert.alert('Error', 'Failed to take photo');
		return null;
	}
}

export async function pickImageFromLibrary() {
	const hasPermission = await requestMediaLibraryPermission();
	if (!hasPermission) return null;

	try {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [4, 3],
			quality: 0.4, // 進一步降低質量以減少文件大小（0.4 = 40%）
			base64: true,
			allowsMultipleSelection: false,
		});

		if (!result.canceled && result.assets && result.assets.length > 0) {
			const asset = result.assets[0];
			// 檢查 base64 大小
			if (asset.base64) {
				const sizeInMB = asset.base64.length / (1024 * 1024);
				console.log('Image base64 size:', sizeInMB.toFixed(2), 'MB');
				if (sizeInMB > 3) {
					console.warn('Image is large, consider reducing quality further');
				}
			}
			return {
				uri: asset.uri,
				base64: asset.base64,
				width: asset.width,
				height: asset.height,
			};
		}
		return null;
	} catch (error) {
		console.error('Error picking image from library:', error);
		Alert.alert('Error', 'Failed to select image');
		return null;
	}
}

export async function showImagePickerOptions() {
	return new Promise((resolve) => {
		Alert.alert(
			'Select Receipt Photo',
			'Choose an option',
			[
				{
					text: 'Take Photo',
					onPress: async () => {
						const image = await pickImageFromCamera();
						resolve(image);
					},
				},
				{
					text: 'Choose from Library',
					onPress: async () => {
						const image = await pickImageFromLibrary();
						resolve(image);
					},
				},
				{
					text: 'Cancel',
					style: 'cancel',
					onPress: () => resolve(null),
				},
			]
		);
	});
}


